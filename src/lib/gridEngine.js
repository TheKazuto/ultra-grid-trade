import { calcGridLevels, toBaseUnits, fromBaseUnits, makeTrade, USDC } from './constants.js'
import { buildAftermathTx, getAftermathPrice } from './aftermath.js'
import { get7KQuote, build7KTx, get7KPrice } from './sevenK.js'

export class GridBotEngine {
  constructor({ token, priceMin, priceMax, gridCount, capitalUsdc, slippage, mode, dex,
    walletAddress, signAndExecute, onTrade, onRebalance, onError, onPriceUpdate }) {
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
    this.checkInterval = { conservative: 12000, balanced: 8000, aggressive: 4000 }[mode] || 8000
  }

  start() {
    if (this.running) return
    this.running = true
    this.startTime = Date.now()
    this.interval = setInterval(() => this._tick(), this.checkInterval)
    this._tick()
  }

  stop() {
    this.running = false
    if (this.interval) { clearInterval(this.interval); this.interval = null }
  }

  async _tick() {
    if (!this.running) return
    try {
      const price = await this._fetchPrice()
      if (!price) return
      this.onPriceUpdate(price)
      if (price < this.priceMin || price > this.priceMax) {
        await this._rebalanceGrid(price)
        return
      }
      const crossed = this._detectCrossing(price)
      if (!crossed) { this.lastPrice = price; return }
      const side = price > this.lastPrice ? 'SELL' : 'BUY'
      await this._executeTrade({ side, price, level: crossed })
      this.lastCrossedLevel = crossed
      this.lastPrice = price
    } catch (err) {
      this.onError(err.message)
    }
  }

  async _fetchPrice() {
    try {
      const p = await get7KPrice(this.token.contract)
      if (p != null) return p
    } catch {}
    try {
      const p = await getAftermathPrice(this.token.contract)
      if (p != null) return p
    } catch {}
    return null
  }

  _detectCrossing(price) {
    if (!this.lastPrice) { this.lastPrice = price; return null }
    for (const level of this.levels) {
      const crossed = (this.lastPrice < level && price >= level) || (this.lastPrice > level && price <= level)
      if (crossed && level !== this.lastCrossedLevel) return level
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
        amountIn = toBaseUnits((usdcAmount / price).toFixed(this.token.decimals), this.token.decimals)
      }

      if (this.dex === 'aftermath') {
        const result = await buildAftermathTx({ walletAddress: this.walletAddress, tokenInContract, tokenOutContract, amountIn, slippage: this.slippage })
        txb = result.txb
      } else {
        const quote = await get7KQuote({ tokenInContract, tokenOutContract, amountIn })
        const result = await build7KTx({ quoteResponse: quote, walletAddress: this.walletAddress, slippage: this.slippage, partnerAddress: this.walletAddress })
        txb = result.tx
      }

      const { digest } = await new Promise((resolve, reject) => {
        this.signAndExecute({ transaction: txb }, { onSuccess: resolve, onError: reject })
      })

      this.volume += usdcAmount
      this.pnl += ((this.priceMax - this.priceMin) / (this.gridCount - 1) / price) * usdcAmount * 0.85
      const trade = makeTrade({ side, price, amount: (usdcAmount / price).toFixed(6), token: this.token.symbol, via: this.dex === 'aftermath' ? 'Aftermath' : '7K', digest })
      this.trades.unshift(trade)
      if (this.trades.length > 200) this.trades.pop()
      this.onTrade({ trade, pnl: this.pnl, volume: this.volume, trades: this.trades })
    } catch (err) {
      this.onError(`Trade failed: ${err.message}`)
    }
  }

  async _rebalanceGrid(price) {
    const half = (this.priceMax - this.priceMin) / 2
    this.priceMin = Math.max(0.000001, price - half)
    this.priceMax = price + half
    this.levels = calcGridLevels(this.priceMin, this.priceMax, this.gridCount)
    this.lastCrossedLevel = null
    this.onRebalance({ priceMin: this.priceMin, priceMax: this.priceMax, levels: this.levels, currentPrice: price })
  }

  getStats() {
    return { pnl: this.pnl, volume: this.volume, trades: this.trades, levels: this.levels,
      priceMin: this.priceMin, priceMax: this.priceMax, running: this.running,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0 }
  }
}
