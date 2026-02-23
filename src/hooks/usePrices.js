import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'

// ============================================================
// PRICE SOURCES — tried in order, first success wins
// ============================================================
const COINGECKO_IDS = {
  SUI:  'sui',
  WAL:  'walrus-2',
  DEEP: 'deepbook',
  IKA:  'ika',
}

// Fetch from 7K API
async function fetchFrom7K(contracts) {
  const params = contracts.map((c) => `coinTypes=${encodeURIComponent(c)}`).join('&')
  const res = await fetch(`https://api.7k.ag/prices?${params}`, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`7K API ${res.status}`)
  return res.json()
}

// Fetch from CoinGecko (free, no key needed)
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

    // ── Try 7K first ────────────────────────────────────────
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await fetchFrom7K(contracts)

      for (const [sym, token] of Object.entries(TOKENS)) {
        const entry = data[token.contract]
        if (entry?.price) newPrices[sym] = parseFloat(entry.price)
      }

      if (Object.keys(newPrices).length > 0) {
        console.log('[Prices] Loaded from 7K:', newPrices)
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] 7K failed:', err.message)
    }

    // ── Fallback: CoinGecko ──────────────────────────────────
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
