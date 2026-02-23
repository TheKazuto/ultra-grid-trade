import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'

// ============================================================
// usePrices — polls 7K price API for all token prices
// Updates every 10 seconds
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
    try {
      const contracts = Object.values(TOKENS).map((t) => t.contract)
      const params = contracts.map((c) => `coinTypes=${encodeURIComponent(c)}`).join('&')
      const res = await fetch(`https://api.7k.ag/prices?${params}`)
      if (!res.ok) return

      const data = await res.json()

      const newPrices = {}
      for (const [sym, token] of Object.entries(TOKENS)) {
        const entry = data[token.contract]
        if (entry?.price) newPrices[sym] = parseFloat(entry.price)
      }

      setPrices((prev) => ({ ...prev, ...newPrices }))

      // Append to history (max 100 points per token)
      setHistory((prev) => {
        const next = { ...prev }
        for (const [sym, price] of Object.entries(newPrices)) {
          next[sym] = [...(prev[sym] || []).slice(-99), price]
        }
        return next
      })
    } catch (err) {
      // Silently fail — price display is non-critical
      console.warn('Price fetch error:', err.message)
    }
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 10000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { prices, history }
}
