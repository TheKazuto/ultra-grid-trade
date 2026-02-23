import { calcGridLevels, toBaseUnits, fromBaseUnits, makeTrade, USDC } from './constants.js'
import { buildAftermathTx } from './aftermath.js'
import { get7KQuote, build7KTx, get7KPrice } from './sevenK.js'
import { getAftermathPrice } from './aftermath.js'

// ============================================================
// GRID BOT ENGINE
// Manages grid state, detects price crossings, fires trades
// ============================================================
export class GridBotEngine {
  constructor({
    token,
    priceMin,
    priceMax,
    gridCount,
    capitalUsdc,
    slippage,
    mode,
    dex,
    walletAddress,
    signAndExecute,
    onTrade,
    onRebalance,
    onError,
    onPriceUpdate,
  }) {
    this.token = token
    this.priceMin = parseFloat(priceMin)
    this.priceMax = parseFloat(priceMax)
    this.gridCount = parseInt(gridCount)
    this.capitalUsdc = parseFloat(capitalUsdc)
    this.slippage = parseFloat(slippage) / 100
    this.mode = mode
    this.dex = dex
    this.walletAddress = walletAddress
    this.signAndExecute = signAndExecute
    this.onTrade = onTrade || (() => {})
    this.onRebalance = onRebalance || (() => {})
    this.onError = onError || (() => {})
    this.onPriceUpdate = onPriceUpdate || (() => {})

    this.levels = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.capitalPerGrid = this.capitalUsdc / this.gridCount
    this.lastPrice = null
    this.lastCrossedLevel = null
    this.running = false
    this.interval = null

    this.pnl = 0
    this.volume = 0
    this.trades = []
    this.startTime = null

    this.checkInterval = {
      conservative: 12000,
      balanced: 8000,
      aggressive: 4000,
    }[mode] || 8000
  }

  start() {
    if (this.running) return
    this.running = true
    this.startTime = Date.now()
    console.log('[GridBot] Starting. Levels:', this.levels)
    this.interval = setInterval(() => this._tick(), this.checkInterval)
    this._tick()
  }

  stop() {
    this.running = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    console.log('[GridBot] Stopped.')
  }

  async _tick() {
    if (!this.running) return

    try {
      const currentPrice = await this._fetchPrice()
      if (!currentPrice) return

      this.onPriceUpdate(currentPrice)

      if (currentPrice < this.priceMin || currentPrice > this.priceMax) {
        await this._rebalanceGrid(currentPrice)
        return
      }

      const crossedLevel = this._detectCrossing(currentPrice)
      if (!crossedLevel) {
        this.lastPrice = currentPrice
        return
      }

      const side = currentPrice > this.lastPrice ? 'SELL' : 'BUY'
      console.log(`[GridBot] Price crossed level $${crossedLevel} → ${side}`)

      await this._executeTrade({ side, price: currentPrice, level: crossedLevel })
      this.lastCrossedLevel = crossedLevel
      this.lastPrice = currentPrice

    } catch (err) {
      console.error('[GridBot] Tick error:', err)
      this.onError(err.message)
    }
  }

  // ────────────────────────────────────────────────────────
  // FETCH CURRENT PRICE
  // Uses 7K SDK price function (no CORS), then Aftermath Prices API
  // ────────────────────────────────────────────────────────
  async _fetchPrice() {
    // Try 7K SDK price (native, no CORS issues)
    try {
      const price = await get7KPrice(this.token.contract)
      if (price != null) return price
    } catch {}

    // Fallback: Aftermath Prices SDK
    try {
      const price = await getAftermathPrice(this.token.contract, this.token.decimals)
      if (price != null) return price
    } catch {}

    return null
  }

  _detectCrossing(currentPrice) {
    if (!this.lastPrice) {
      this.lastPrice = currentPrice
      return null
    }

    for (const level of this.levels) {
      const crossed =
        (this.lastPrice < level && currentPrice >= level) ||
        (this.lastPrice > level && currentPrice <= level)

      if (crossed && level !== this.lastCrossedLevel) {
        return level
      }
    }

    return null
  }

  async _executeTrade({ side, price, level }) {
    try {
      const usdcAmount = this.capitalPerGrid
      let txb, tokenInContract, tokenOutContract, amountIn

      if (side === 'BUY') {
        tokenInContract = USDC.contract
        tokenOutContract = this.token.contract
        amountIn = toBaseUnits(usdcAmount.toString(), USDC.decimals)
      } else {
        tokenInContract = this.token.contract
        tokenOutContract = USDC.contract
        const tokenAmount = usdcAmount / price
        amountIn = toBaseUnits(tokenAmount.toFixed(this.token.decimals), this.token.decimals)
      }

      if (this.dex === 'aftermath') {
        const result = await buildAftermathTx({
          walletAddress: this.walletAddress,
          tokenInContract,
          tokenOutContract,
          amountIn,
          slippage: this.slippage,
        })
        txb = result.txb
      } else {
        // 7K Aggregator
        const quote = await get7KQuote({
          tokenInContract,
          tokenOutContract,
          amountIn,
        })
        const result = await build7KTx({
          quoteResponse: quote,
          walletAddress: this.walletAddress,
          slippage: this.slippage,
          partnerAddress: this.walletAddress,
        })
        // 7K SDK returns { tx, coinOut }
        txb = result.tx
      }

      const { digest } = await new Promise((resolve, reject) => {
        this.signAndExecute(
          { transaction: txb },
          {
            onSuccess: resolve,
            onError: reject,
          }
        )
      })

      this.volume += usdcAmount
      const gridSpacing = (this.priceMax - this.priceMin) / (this.gridCount - 1)
      const gridProfit = (gridSpacing / price) * usdcAmount
      this.pnl += gridProfit * 0.85

      const trade = makeTrade({
        side,
        price,
        amount: (usdcAmount / price).toFixed(6),
        token: this.token.symbol,
        via: this.dex === 'aftermath' ? 'Aftermath' : '7K',
        digest,
      })

      this.trades.unshift(trade)
      if (this.trades.length > 200) this.trades.pop()

      this.onTrade({
        trade,
        pnl: this.pnl,
        volume: this.volume,
        trades: this.trades,
      })

      console.log('[GridBot] Trade executed:', digest)

    } catch (err) {
      console.error('[GridBot] Trade execution failed:', err)
      this.onError(`Trade failed: ${err.message}`)
    }
  }

  async _rebalanceGrid(currentPrice) {
    const rangeWidth = this.priceMax - this.priceMin
    const halfRange = rangeWidth / 2

    this.priceMin = Math.max(0.000001, currentPrice - halfRange)
    this.priceMax = currentPrice + halfRange
    this.levels = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.lastCrossedLevel = null

    console.log(`[GridBot] Rebalanced: $${this.priceMin.toFixed(4)} — $${this.priceMax.toFixed(4)}`)

    this.onRebalance({
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      levels: this.levels,
      currentPrice,
    })
  }

  getStats() {
    return {
      pnl: this.pnl,
      volume: this.volume,
      trades: this.trades,
      levels: this.levels,
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      running: this.running,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    }
  }
}
