import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'
import { get7KPrices } from '../lib/sevenK.js'
import { getAftermathPrices } from '../lib/aftermath.js'

// CoinGecko public API (no key needed, rate limited but reliable)
const CG_IDS = {
  SUI:  'sui',
  WAL:  'walrus-2',
  DEEP: 'deep-book',
  IKA:  'ika-network',
}

async function fetchCoinGecko() {
  const ids = Object.values(CG_IDS).join(',')
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  const out = {}
  for (const [sym, cgId] of Object.entries(CG_IDS)) {
    if (data[cgId]?.usd != null) out[sym] = parseFloat(data[cgId].usd)
  }
  return out
}

// Binance public API — no key, no CORS issues
const BINANCE_PAIRS = {
  SUI:  'SUIUSDT',
  WAL:  'WALUSDT',
  DEEP: 'DEEPUSDT',
}
async function fetchBinance() {
  const out = {}
  await Promise.allSettled(
    Object.entries(BINANCE_PAIRS).map(async ([sym, pair]) => {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) return
      const data = await res.json()
      if (data?.price) out[sym] = parseFloat(data.price)
    })
  )
  return out
}

export function usePrices() {
  const [prices, setPrices] = useState({ SUI: null, WAL: null, DEEP: null, IKA: null })
  const [history, setHistory] = useState({ SUI: [], WAL: [], DEEP: [], IKA: [] })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    let newPrices = {}

    // ── 1. Try 7K SDK (calls prices.7k.ag internally) ─────────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await get7KPrices(contracts)
      for (const [sym, token] of Object.entries(TOKENS)) {
        if (data[token.contract] != null) newPrices[sym] = data[token.contract]
      }
      console.log('[Prices] 7K result:', newPrices)
    } catch (err) {
      console.warn('[Prices] 7K failed:', err.message)
    }

    const missing = Object.keys(TOKENS).filter((sym) => newPrices[sym] == null)

    // ── 2. Fill gaps with Aftermath SDK ───────────────────────
    if (missing.length > 0) {
      try {
        const missingContracts = missing.map((sym) => TOKENS[sym].contract)
        const data = await getAftermathPrices(missingContracts)
        for (const sym of missing) {
          const contract = TOKENS[sym].contract
          if (data[contract] != null) newPrices[sym] = data[contract]
        }
        console.log('[Prices] Aftermath result:', newPrices)
      } catch (err) {
        console.warn('[Prices] Aftermath failed:', err.message)
      }
    }

    const stillMissing = Object.keys(TOKENS).filter((sym) => newPrices[sym] == null)

    // ── 3. Binance (fast, no CORS, no key) ────────────────────
    if (stillMissing.length > 0) {
      try {
        const binance = await fetchBinance()
        for (const sym of stillMissing) {
          if (binance[sym] != null) newPrices[sym] = binance[sym]
        }
        console.log('[Prices] Binance result:', newPrices)
      } catch (err) {
        console.warn('[Prices] Binance failed:', err.message)
      }
    }

    const finalMissing = Object.keys(TOKENS).filter((sym) => newPrices[sym] == null)

    // ── 4. CoinGecko final fallback ───────────────────────────
    if (finalMissing.length > 0) {
      try {
        const cg = await fetchCoinGecko()
        for (const sym of finalMissing) {
          if (cg[sym] != null) newPrices[sym] = cg[sym]
        }
        console.log('[Prices] CoinGecko result:', newPrices)
      } catch (err) {
        console.warn('[Prices] CoinGecko failed:', err.message)
      }
    }

    if (Object.keys(newPrices).length > 0) {
      applyPrices(newPrices)
    }
  }

  function applyPrices(p) {
    setPrices((prev) => ({ ...prev, ...p }))
    setHistory((prev) => {
      const next = { ...prev }
      for (const [sym, price] of Object.entries(p)) {
        next[sym] = [...(prev[sym] || []).slice(-99), price]
      }
      return next
    })
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 15000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { prices, history }
}
