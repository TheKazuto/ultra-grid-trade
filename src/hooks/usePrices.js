import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'
import { get7KPrices } from '../lib/sevenK.js'
import { getAftermathPrices } from '../lib/aftermath.js'

// ============================================================
// COINGECKO FALLBACK — uses cgId field from TOKENS
// ============================================================
async function fetchFromCoinGecko(tokenMap) {
  const idToSym = {}
  const ids = []
  for (const [sym, token] of Object.entries(tokenMap)) {
    if (token.cgId) {
      idToSym[token.cgId] = sym
      ids.push(token.cgId)
    }
  }
  if (ids.length === 0) return {}

  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()

  const result = {}
  for (const [cgId, sym] of Object.entries(idToSym)) {
    if (data[cgId]?.usd) result[sym] = parseFloat(data[cgId].usd)
  }
  return result
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

    // ── Try 7K SDK first (no CORS) ────────────────────────────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await get7KPrices(contracts)

      for (const [sym, token] of Object.entries(TOKENS)) {
        const price = data[token.contract]
        if (price != null) newPrices[sym] = price
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] 7K SDK:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] 7K SDK failed:', err.message)
    }

    // ── Fallback: Aftermath Prices SDK ────────────────────────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await getAftermathPrices(contracts)

      for (const [sym, token] of Object.entries(TOKENS)) {
        const price = data[token.contract]
        if (price != null) newPrices[sym] = price
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] Aftermath:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] Aftermath failed:', err.message)
    }

    // ── Final fallback: CoinGecko ─────────────────────────────
    try {
      const cgPrices = await fetchFromCoinGecko(TOKENS)
      if (Object.keys(cgPrices).length > 0) {
        console.log('[Prices] CoinGecko:', cgPrices)
        applyPrices(cgPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] CoinGecko failed:', err.message)
    }

    console.warn('[Prices] All sources failed')
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
