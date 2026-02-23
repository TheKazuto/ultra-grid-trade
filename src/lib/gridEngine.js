import { calcGridLevels, toBaseUnits, fromBaseUnits, makeTrade, USDC } from './constants.js'
import { buildAftermathTx, getAftermathPrice } from './aftermath.js'
import { get7KPrice } from './sevenK.js' // usado apenas para preço

export class GridBotEngine {
  constructor({
    token, priceMin, priceMax, gridCount, capitalUsdc,
    slippage, mode, dex, walletAddress,
    signAndExecute, onTrade, onRebalance, onError, onPriceUpdate
  }) {
    this.token         = token          // objeto completo: { symbol, contract, decimals, ... }
    this.priceMin      = parseFloat(priceMin)
    this.priceMax      = parseFloat(priceMax)
    this.gridCount     = parseInt(gridCount)
    this.capitalUsdc   = parseFloat(capitalUsdc)
    this.slippage      = parseFloat(slippage) / 100
    this.mode          = mode
    this.dex           = dex
    this.walletAddress = walletAddress
    this.signAndExecute = signAndExecute  // mutateAsync — retorna Promise
    this.onTrade       = onTrade       || (() => {})
    this.onRebalance   = onRebalance   || (() => {})
    this.onError       = onError       || (() => {})
    this.onPriceUpdate = onPriceUpdate || (() => {})

    this.levels          = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.capitalPerGrid  = this.capitalUsdc / this.gridCount
    this.lastPrice       = null
    this.lastCrossedLevel = null
    this.running         = false
    this.interval        = null
    this.pnl             = 0
    this.volume          = 0
    this.trades          = []
    this.startTime       = null
    this.checkInterval   = { conservative: 12000, balanced: 8000, aggressive: 4000 }[mode] || 8000
  }

  start() {
    if (this.running) return
    this.running   = true
    this.startTime = Date.now()
    this._tick()
    this.interval  = setInterval(() => this._tick(), this.checkInterval)
  }

  stop() {
    this.running = false
    if (this.interval) { clearInterval(this.interval); this.interval = null }
  }

  // ─────────────────────────────────────────────
  // TICK — roda a cada checkInterval
  // ─────────────────────────────────────────────
  async _tick() {
    if (!this.running) return
    try {
      const price = await this._fetchPrice()
      if (price == null) {
        console.warn('[GridBot] Could not fetch price')
        return
      }
      this.onPriceUpdate(price)

      // Preço fora do range → rebalancear
      if (price < this.priceMin || price > this.priceMax) {
        await this._rebalanceGrid(price)
        return
      }

      // Detectar cruzamento de nível
      const crossed = this._detectCrossing(price)
      if (!crossed) { this.lastPrice = price; return }

      const side = price > this.lastPrice ? 'SELL' : 'BUY'
      await this._executeTrade({ side, price, level: crossed })
      this.lastCrossedLevel = crossed
      this.lastPrice        = price
    } catch (err) {
      console.error('[GridBot] tick error:', err)
      this.onError(err.message)
    }
  }

  // ─────────────────────────────────────────────
  // FETCH PRICE — usa /api/prices via get7KPrice
  // ─────────────────────────────────────────────
  async _fetchPrice() {
    // get7KPrice agora aceita o símbolo do token, não o contrato
    try {
      const p = await get7KPrice(this.token.contract)
      if (p != null) return p
    } catch (e) {
      console.warn('[GridBot] get7KPrice failed:', e.message)
    }
    try {
      const p = await getAftermathPrice(this.token.contract)
      if (p != null) return p
    } catch (e) {
      console.warn('[GridBot] getAftermathPrice failed:', e.message)
    }
    return null
  }

  // ─────────────────────────────────────────────
  // DETECTAR CRUZAMENTO DE NÍVEL
  // ─────────────────────────────────────────────
  _detectCrossing(price) {
    if (!this.lastPrice) { this.lastPrice = price; return null }
    for (const level of this.levels) {
      const crossed =
        (this.lastPrice < level && price >= level) ||
        (this.lastPrice > level && price <= level)
      if (crossed && level !== this.lastCrossedLevel) return level
    }
    return null
  }

  // ─────────────────────────────────────────────
  // EXECUTAR TRADE — constrói e assina a tx
  // ─────────────────────────────────────────────
  async _executeTrade({ side, price, level }) {
    try {
      const usdcAmount = this.capitalPerGrid
      let txb, tokenInContract, tokenOutContract, amountIn

      if (side === 'BUY') {
        tokenInContract  = USDC.contract
        tokenOutContract = this.token.contract
        amountIn         = toBaseUnits(usdcAmount.toString(), USDC.decimals)
      } else {
        tokenInContract  = this.token.contract
        tokenOutContract = USDC.contract
        const tokenAmt   = (usdcAmount / price).toFixed(this.token.decimals ?? 9)
        amountIn         = toBaseUnits(tokenAmt, this.token.decimals ?? 9)
      }

      console.log(`[GridBot] ${side} @ ${price} | level ${level} | amountIn ${amountIn}`)

      // ── Construir transação via Aftermath ────
      const buildResult = await buildAftermathTx({
        walletAddress:    this.walletAddress,
        tokenInContract,
        tokenOutContract,
        amountIn,
        slippage: this.slippage,
      })
      txb = buildResult.txb

      if (!txb) throw new Error('Transaction build failed — txb is null')

      // ── Assinar e executar via wallet ─────────
      // signAndExecute = mutateAsync do dapp-kit → retorna Promise<{ digest }>
      const result = await this.signAndExecute({
        transaction: txb,
        chain: 'sui:mainnet',
      })

      const digest = result?.digest
      console.log('[GridBot] tx executed:', digest)

      // ── Atualizar estado ──────────────────────
      this.volume += usdcAmount
      const gridSpacing = (this.priceMax - this.priceMin) / (this.gridCount - 1)
      this.pnl += (gridSpacing / price) * usdcAmount * 0.85

      const trade = makeTrade({
        side,
        price,
        amount: (usdcAmount / price).toFixed(6),
        token:  this.token.symbol,
        via:    'Aftermath',
        digest,
      })
      this.trades.unshift(trade)
      if (this.trades.length > 200) this.trades.pop()

      this.onTrade({ trade, pnl: this.pnl, volume: this.volume, trades: this.trades })

    } catch (err) {
      console.error('[GridBot] _executeTrade error:', err)
      // Erro de rejeição pelo usuário não deve parar o bot
      if (err.message?.includes('rejected') || err.message?.includes('canceled')) {
        this.onError('Transaction rejected by user')
      } else {
        this.onError(`Trade failed: ${err.message}`)
      }
    }
  }

  // ─────────────────────────────────────────────
  // REBALANCEAR GRID
  // ─────────────────────────────────────────────
  async _rebalanceGrid(price) {
    const half     = (this.priceMax - this.priceMin) / 2
    this.priceMin  = Math.max(0.000001, price - half)
    this.priceMax  = price + half
    this.levels    = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.lastCrossedLevel = null
    console.log(`[GridBot] Rebalanced grid: ${this.priceMin.toFixed(6)} – ${this.priceMax.toFixed(6)}`)
    this.onRebalance({
      priceMin:     this.priceMin,
      priceMax:     this.priceMax,
      levels:       this.levels,
      currentPrice: price,
    })
  }

  getStats() {
    return {
      pnl:      this.pnl,
      volume:   this.volume,
      trades:   this.trades,
      levels:   this.levels,
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      running:  this.running,
      uptime:   this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    }
  }
}
