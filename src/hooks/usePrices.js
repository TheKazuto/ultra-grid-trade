import { useState, useEffect, useRef } from 'react'
import { TOKENS } from '../lib/constants.js'
import { getAftermathPrices } from '../lib/aftermath.js'

// Busca preços via /api/prices (Vercel serverless — sem CORS)
async function fetchServerPrices() {
  const res = await fetch('/api/prices', { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`/api/prices ${res.status}`)
  return res.json() // { SUI: 1.23, WAL: 0.45, ... }
}

// Aftermath como fallback para tokens ausentes
async function fetchAftermathFill(missingSyms) {
  const contracts = missingSyms.map((s) => TOKENS[s]?.contract).filter(Boolean)
  if (!contracts.length) return {}
  const data = await getAftermathPrices(contracts)
  const out = {}
  for (const sym of missingSyms) {
    const v = data[TOKENS[sym]?.contract]
    if (v != null) out[sym] = v
  }
  return out
}

export function usePrices() {
  const [prices, setPrices] = useState({ SUI: null, WAL: null, DEEP: null, IKA: null })
  const [history, setHistory] = useState({ SUI: [], WAL: [], DEEP: [], IKA: [] })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    let result = {}

    // 1. Serverless proxy → CoinGecko (sem CORS, cacheado 12s)
    try {
      result = await fetchServerPrices()
      console.log('[Prices] server:', result)
    } catch (err) {
      console.warn('[Prices] /api/prices failed:', err.message)
    }

    // 2. Aftermath para qualquer token que falhou
    const missing = Object.keys(TOKENS).filter((s) => result[s] == null)
    if (missing.length > 0) {
      try {
        const af = await fetchAftermathFill(missing)
        Object.assign(result, af)
        console.log('[Prices] aftermath fill:', af)
      } catch (err) {
        console.warn('[Prices] Aftermath failed:', err.message)
      }
    }

    if (Object.keys(result).length > 0) applyPrices(result)
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
    intervalRef.current = setInterval(fetchAll, 20000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { prices, history }
}
