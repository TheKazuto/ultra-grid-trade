import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'
import { get7KPrices } from '../lib/sevenK.js'
import { getAftermathPrices } from '../lib/aftermath.js'

// ============================================================
// COINGECKO FALLBACK IDs
// ============================================================
const COINGECKO_IDS = {
  SUI:  'sui',
  WAL:  'walrus-2',
  DEEP: 'deepbook',
  IKA:  'ika',
}

async function fetchFromCoinGecko(symbols) {
  const ids = symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',')
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { 'Accept': 'application/json' } }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  return res.json()
}

// ============================================================
// usePrices hook
// ============================================================
export function usePrices() {
  const [prices, setPrices] = useState({
    SUI: null, WAL: null, DEEP: null, IKA: null,
  })
  const [history, setHistory] = useState({
    SUI: [], WAL: [], DEEP: [], IKA: [],
  })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    const newPrices = {}

    // ── Try 7K SDK first (no CORS — uses SDK internals) ──────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await get7KPrices(contracts)

      for (const [sym, token] of Object.entries(TOKENS)) {
        const price = data[token.contract]
        if (price != null) newPrices[sym] = price
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] Loaded from 7K SDK:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] 7K SDK failed:', err.message)
    }

    // ── Fallback: Aftermath Prices SDK ───────────────────────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await getAftermathPrices(contracts)

      for (const [sym, token] of Object.entries(TOKENS)) {
        const price = data[token.contract]
        if (price != null) newPrices[sym] = price
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] Loaded from Aftermath:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] Aftermath failed:', err.message)
    }

    // ── Final fallback: CoinGecko (public API) ───────────────
    try {
      const syms = Object.keys(TOKENS)
      const data = await fetchFromCoinGecko(syms)

      for (const [sym, cgId] of Object.entries(COINGECKO_IDS)) {
        const price = data[cgId]?.usd
        if (price) newPrices[sym] = parseFloat(price)
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] Loaded from CoinGecko:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] CoinGecko failed:', err.message)
    }

    console.warn('[Prices] All price sources failed')
  }

  function applyPrices(newPrices) {
    setPrices((prev) => ({ ...prev, ...newPrices }))
    setHistory((prev) => {
      const next = { ...prev }
      for (const [sym, price] of Object.entries(newPrices)) {
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
