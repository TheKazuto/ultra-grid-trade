import { useState, useRef, useCallback } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { GridBotEngine } from '../lib/gridEngine.js'
import { TOKENS } from '../lib/constants.js'

export function useGridBot() {
  const engineRef = useRef(null)

  // mutateAsync retorna uma Promise — essencial para await dentro do engine
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const [running, setRunning]           = useState(false)
  const [currentPrice, setCurrentPrice] = useState(null)
  const [pnl, setPnl]                   = useState(0)
  const [volume, setVolume]             = useState(0)
  const [trades, setTrades]             = useState([])
  const [levels, setLevels]             = useState([])
  const [priceMin, setPriceMin]         = useState(0)
  const [priceMax, setPriceMax]         = useState(0)
  const [lastError, setLastError]       = useState(null)
  const [lastRebalance, setLastRebalance] = useState(null)

  const startBot = useCallback((config) => {
    if (engineRef.current) engineRef.current.stop()

    const token = TOKENS[config.token]
    if (!token) throw new Error('Invalid token selected')

    const engine = new GridBotEngine({
      token,
      priceMin:     config.priceMin,
      priceMax:     config.priceMax,
      gridCount:    config.gridCount,
      capitalUsdc:  config.capitalUsdc,
      slippage:     config.slippage,
      mode:         config.mode,
      dex:          config.dex,
      walletAddress: config.walletAddress,
      // Passa mutateAsync — retorna Promise, necessário para await no engine
      signAndExecute,

      onPriceUpdate: (price) => setCurrentPrice(price),

      onTrade: ({ trade, pnl: p, volume: v, trades: t }) => {
        setPnl(p)
        setVolume(v)
        setTrades([...t])
      },

      onRebalance: ({ priceMin: min, priceMax: max, levels: lvls }) => {
        setPriceMin(min)
        setPriceMax(max)
        setLevels(lvls)
        setLastRebalance(new Date().toLocaleTimeString())
      },

      onError: (msg) => {
        setLastError(msg)
        setTimeout(() => setLastError(null), 8000)
      },
    })

    engineRef.current = engine
    engine.start()

    setRunning(true)
    setLevels(engine.levels)
    setPriceMin(engine.priceMin)
    setPriceMax(engine.priceMax)
    setPnl(0)
    setVolume(0)
    setTrades([])
  }, [signAndExecute])

  const stopBot = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop()
      engineRef.current = null
    }
    setRunning(false)
  }, [])

  const resetBot = useCallback(() => {
    stopBot()
    setCurrentPrice(null)
    setPnl(0)
    setVolume(0)
    setTrades([])
    setLevels([])
    setPriceMin(0)
    setPriceMax(0)
    setLastError(null)
    setLastRebalance(null)
  }, [stopBot])

  return {
    startBot, stopBot, resetBot,
    running, currentPrice, pnl, volume, trades,
    levels, priceMin, priceMax, lastError, lastRebalance,
  }
}
