import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'
import { get7KPrices } from '../lib/sevenK.js'
import { getAftermathPrices } from '../lib/aftermath.js'

// CoinGecko IDs — verified slugs
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
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  const out = {}
  for (const [sym, cgId] of Object.entries(CG_IDS)) {
    if (data[cgId]?.usd != null) out[sym] = parseFloat(data[cgId].usd)
  }
  return out
}

export function usePrices() {
  const [prices, setPrices] = useState({ SUI: null, WAL: null, DEEP: null, IKA: null })
  const [history, setHistory] = useState({ SUI: [], WAL: [], DEEP: [], IKA: [] })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    let newPrices = {}

    // 1. Try 7K via proxy (no CORS)
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const data = await get7KPrices(contracts)
      for (const [sym, token] of Object.entries(TOKENS)) {
        if (data[token.contract] != null) newPrices[sym] = data[token.contract]
      }
      if (Object.keys(newPrices).length === Object.keys(TOKENS).length) {
        applyPrices(newPrices)
        return
      }
    } catch (err) {
      console.warn('[Prices] 7K proxy failed:', err.message)
    }

    // 2. Fill gaps with Aftermath SDK
    const missingContracts = Object.entries(TOKENS)
      .filter(([sym]) => newPrices[sym] == null)
      .map(([, t]) => t.contract)

    if (missingContracts.length > 0) {
      try {
        const data = await getAftermathPrices(missingContracts)
        for (const [sym, token] of Object.entries(TOKENS)) {
          if (newPrices[sym] == null && data[token.contract] != null) {
            newPrices[sym] = data[token.contract]
          }
        }
      } catch (err) {
        console.warn('[Prices] Aftermath failed:', err.message)
      }
    }

    if (Object.keys(newPrices).length > 0) {
      applyPrices(newPrices)
      return
    }

    // 3. Final fallback: CoinGecko
    try {
      const cgPrices = await fetchCoinGecko()
      if (Object.keys(cgPrices).length > 0) applyPrices(cgPrices)
    } catch (err) {
      console.warn('[Prices] CoinGecko failed:', err.message)
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
