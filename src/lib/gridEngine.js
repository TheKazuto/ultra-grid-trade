import { calcGridLevels, toBaseUnits, fromBaseUnits, makeTrade, USDC } from './constants.js'
import { buildAftermathTx } from './aftermath.js'
import { get7KQuote, build7KTx } from './sevenK.js'

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
    signAndExecute, // from @mysten/dapp-kit useSignAndExecuteTransaction
    onTrade,        // callback when a trade completes
    onRebalance,    // callback when grid rebalances
    onError,        // callback on error
    onPriceUpdate,  // callback with latest price
  }) {
    this.token = token
    this.priceMin = parseFloat(priceMin)
    this.priceMax = parseFloat(priceMax)
    this.gridCount = parseInt(gridCount)
    this.capitalUsdc = parseFloat(capitalUsdc)
    this.slippage = parseFloat(slippage) / 100  // convert % to decimal
    this.mode = mode
    this.dex = dex
    this.walletAddress = walletAddress
    this.signAndExecute = signAndExecute
    this.onTrade = onTrade || (() => {})
    this.onRebalance = onRebalance || (() => {})
    this.onError = onError || (() => {})
    this.onPriceUpdate = onPriceUpdate || (() => {})

    // Grid state
    this.levels = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.capitalPerGrid = this.capitalUsdc / this.gridCount
    this.lastPrice = null
    this.lastCrossedLevel = null
    this.running = false
    this.interval = null

    // Stats
    this.pnl = 0
    this.volume = 0
    this.trades = []
    this.startTime = null

    // Interval timing by mode (ms between price checks)
    this.checkInterval = {
      conservative: 12000,
      balanced: 8000,
      aggressive: 4000,
    }[mode] || 8000
  }

  // ────────────────────────────────────────────────────────
  // START — begins polling for price and executing trades
  // ────────────────────────────────────────────────────────
  start() {
    if (this.running) return
    this.running = true
    this.startTime = Date.now()
    console.log('[GridBot] Starting. Levels:', this.levels)

    this.interval = setInterval(() => this._tick(), this.checkInterval)
    // First tick immediately
    this._tick()
  }

  // ────────────────────────────────────────────────────────
  // STOP
  // ────────────────────────────────────────────────────────
  stop() {
    this.running = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    console.log('[GridBot] Stopped.')
  }

  // ────────────────────────────────────────────────────────
  // TICK — called on interval
  // ────────────────────────────────────────────────────────
  async _tick() {
    if (!this.running) return

    try {
      const currentPrice = await this._fetchPrice()
      if (!currentPrice) return

      this.onPriceUpdate(currentPrice)

      // Check if price is out of range — trigger rebalance
      if (currentPrice < this.priceMin || currentPrice > this.priceMax) {
        await this._rebalanceGrid(currentPrice)
        return
      }

      // Detect which grid level the price just crossed
      const crossedLevel = this._detectCrossing(currentPrice)
      if (!crossedLevel) {
        this.lastPrice = currentPrice
        return
      }

      // Determine BUY or SELL based on direction of crossing
      const side = currentPrice > this.lastPrice ? 'SELL' : 'BUY'
      console.log(`[GridBot] Price crossed level $${crossedLevel} → ${side}`)

      // Execute trade
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
  // Tries 7K price API, falls back to Aftermath
  // ────────────────────────────────────────────────────────
  async _fetchPrice() {
    try {
      // Try 7K price first (fast)
      const res = await fetch(
        `https://api.7k.ag/prices?coinTypes=${encodeURIComponent(this.token.contract)}`
      )
      if (res.ok) {
        const data = await res.json()
        const values = Object.values(data)
        if (values[0]?.price) return parseFloat(values[0].price)
      }
    } catch {}

    try {
      // Fallback: small test quote from Aftermath to get implied price
      const testAmount = toBaseUnits('1', this.token.decimals)
      const { route } = await buildAftermathTx({
        walletAddress: this.walletAddress,
        tokenInContract: this.token.contract,
        tokenOutContract: USDC.contract,
        amountIn: testAmount,
        slippage: 0.01,
      })
      if (route?.coinOut) {
        return fromBaseUnits(route.coinOut, USDC.decimals)
      }
    } catch {}

    return null
  }

  // ────────────────────────────────────────────────────────
  // DETECT GRID CROSSING
  // Returns the grid level price that was crossed, or null
  // ────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────
  // EXECUTE TRADE
  // Builds and signs a swap transaction via the selected DEX
  // ────────────────────────────────────────────────────────
  async _executeTrade({ side, price, level }) {
    try {
      // Amount to trade per grid level (in USDC equivalent)
      const usdcAmount = this.capitalPerGrid

      // Convert to token or USDC base units
      let txb
      let tokenInContract
      let tokenOutContract
      let amountIn

      if (side === 'BUY') {
        // Spend USDC to buy the token
        tokenInContract = USDC.contract
        tokenOutContract = this.token.contract
        amountIn = toBaseUnits(usdcAmount.toString(), USDC.decimals)
      } else {
        // Sell token to get USDC
        tokenInContract = this.token.contract
        tokenOutContract = USDC.contract
        const tokenAmount = usdcAmount / price
        amountIn = toBaseUnits(tokenAmount.toFixed(this.token.decimals), this.token.decimals)
      }

      // Build transaction via selected DEX
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
        txb = result.tx
      }

      // ──────────────────────────────────────────────────
      // SIGN & EXECUTE VIA USER'S WALLET
      // The wallet shows a confirmation popup to the user
      // The bot NEVER has custody of funds — fully delegated
      // ──────────────────────────────────────────────────
      const { digest } = await new Promise((resolve, reject) => {
        this.signAndExecute(
          { transaction: txb },
          {
            onSuccess: resolve,
            onError: reject,
          }
        )
      })

      // Update stats
      this.volume += usdcAmount
      const gridSpacing = (this.priceMax - this.priceMin) / (this.gridCount - 1)
      const gridProfit = (gridSpacing / price) * usdcAmount
      this.pnl += gridProfit * 0.85 // approximate after fees

      const trade = makeTrade({
        side,
        price,
        amount: side === 'BUY'
          ? (usdcAmount / price).toFixed(6)
          : (usdcAmount / price).toFixed(6),
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

  // ────────────────────────────────────────────────────────
  // REBALANCE GRID
  // Called when price exits configured range
  // Recalculates grid centered on current price
  // ────────────────────────────────────────────────────────
  async _rebalanceGrid(currentPrice) {
    const rangeWidth = this.priceMax - this.priceMin
    const halfRange = rangeWidth / 2

    this.priceMin = Math.max(0.000001, currentPrice - halfRange)
    this.priceMax = currentPrice + halfRange
    this.levels = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.lastCrossedLevel = null

    console.log(`[GridBot] Rebalanced grid: $${this.priceMin.toFixed(4)} — $${this.priceMax.toFixed(4)}`)

    this.onRebalance({
      priceMin: this.priceMin,
      priceMax: this.priceMax,
      levels: this.levels,
      currentPrice,
    })
  }

  // ────────────────────────────────────────────────────────
  // GETTERS
  // ────────────────────────────────────────────────────────
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
