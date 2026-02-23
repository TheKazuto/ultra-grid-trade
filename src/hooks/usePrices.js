import { useState, useEffect, useRef } from 'react'
import { getAftermathPrices } from '../lib/aftermath.js'

// ============================================================
// Token map: symbol → Binance pair + CoinGecko ID
// ============================================================
const TOKEN_MAP = {
  SUI:  { binance: 'SUIUSDT',  cgId: 'sui'       },
  WAL:  { binance: 'WALUSDT',  cgId: 'walrus-2'   },
  DEEP: { binance: 'DEEPUSDT', cgId: 'deep-book'  },
  IKA:  { binance: null,       cgId: 'ika-network' }, // IKA sem par Binance ainda
}

// ── 1. Binance — público, sem CORS, sem chave ──────────────
async function fetchBinance() {
  const pairs = Object.entries(TOKEN_MAP).filter(([, v]) => v.binance)
  const results = await Promise.allSettled(
    pairs.map(async ([sym, { binance }]) => {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${binance}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) throw new Error(`Binance ${res.status}`)
      const data = await res.json()
      return [sym, parseFloat(data.price)]
    })
  )
  const out = {}
  results.forEach((r) => { if (r.status === 'fulfilled') out[r.value[0]] = r.value[1] })
  return out
}

// ── 2. Aftermath SDK ───────────────────────────────────────
import { TOKENS } from '../lib/constants.js'

async function fetchAftermath(missingSyms) {
  const contracts = missingSyms.map((s) => TOKENS[s]?.contract).filter(Boolean)
  if (!contracts.length) return {}
  const data = await getAftermathPrices(contracts)
  const out = {}
  for (const sym of missingSyms) {
    const contract = TOKENS[sym]?.contract
    if (contract && data[contract] != null) out[sym] = data[contract]
  }
  return out
}

// ── 3. CoinGecko — fallback final ─────────────────────────
async function fetchCoinGecko(missingSyms) {
  const ids = missingSyms.map((s) => TOKEN_MAP[s]?.cgId).filter(Boolean).join(',')
  if (!ids) return {}
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const data = await res.json()
  const out = {}
  for (const sym of missingSyms) {
    const cgId = TOKEN_MAP[sym]?.cgId
    if (cgId && data[cgId]?.usd != null) out[sym] = parseFloat(data[cgId].usd)
  }
  return out
}

// ============================================================
export function usePrices() {
  const [prices, setPrices] = useState({ SUI: null, WAL: null, DEEP: null, IKA: null })
  const [history, setHistory] = useState({ SUI: [], WAL: [], DEEP: [], IKA: [] })
  const intervalRef = useRef(null)

  const fetchAll = async () => {
    let result = {}

    // 1. Binance (mais rápido e confiável)
    try {
      const binance = await fetchBinance()
      Object.assign(result, binance)
      console.log('[Prices] Binance:', result)
    } catch (err) {
      console.warn('[Prices] Binance failed:', err.message)
    }

    const missing1 = Object.keys(TOKEN_MAP).filter((s) => result[s] == null)

    // 2. Aftermath para os que faltam
    if (missing1.length > 0) {
      try {
        const af = await fetchAftermath(missing1)
        Object.assign(result, af)
        console.log('[Prices] Aftermath fill:', af)
      } catch (err) {
        console.warn('[Prices] Aftermath failed:', err.message)
      }
    }

    const missing2 = Object.keys(TOKEN_MAP).filter((s) => result[s] == null)

    // 3. CoinGecko como último recurso
    if (missing2.length > 0) {
      try {
        const cg = await fetchCoinGecko(missing2)
        Object.assign(result, cg)
        console.log('[Prices] CoinGecko fill:', cg)
      } catch (err) {
        console.warn('[Prices] CoinGecko failed:', err.message)
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
    intervalRef.current = setInterval(fetchAll, 15000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { prices, history }
}
