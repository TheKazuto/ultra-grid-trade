import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { checkNFTOwnership, getAllBalances } from '../lib/suiClient.js'
import { getTier, TOKENS, USDC, fromBaseUnits } from '../lib/constants.js'

export function useNFT() {
  const account = useCurrentAccount()
  const [nftCount, setNftCount] = useState(0)
  const [tier, setTier] = useState(getTier(0))
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState({})
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    if (!account?.address) {
      setNftCount(0)
      setTier(getTier(0))
      setBalances({})
      setDebugInfo('')
      return
    }

    console.log('[useNFT] Wallet connected:', account.address)
    setLoading(true)
    setDebugInfo('Checking NFTs...')

    const run = async () => {
      try {
        // Run in parallel for speed
        const [nftResult, rawBalances] = await Promise.all([
          checkNFTOwnership(account.address),
          getAllBalances(account.address),
        ])

        console.log('[useNFT] NFT result:', nftResult)
        console.log('[useNFT] Raw balances keys:', Object.keys(rawBalances).length)

        const count = nftResult.count
        setNftCount(count)
        setTier(getTier(count))
        setDebugInfo(`Found ${count} NFT(s)`)

        // Map raw balances to human-readable
        const parsed = {}
        for (const [coinType, raw] of Object.entries(rawBalances)) {
          for (const [sym, token] of Object.entries(TOKENS)) {
            if (coinType === token.contract) {
              parsed[sym] = fromBaseUnits(raw, token.decimals)
            }
          }
          if (coinType === USDC.contract) {
            parsed['USDC'] = fromBaseUnits(raw, USDC.decimals)
          }
        }
        setBalances(parsed)
        console.log('[useNFT] Parsed balances:', parsed)

      } catch (err) {
        console.error('[useNFT] Error:', err)
        setDebugInfo(`Error: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [account?.address])

  return {
    address: account?.address,
    connected: !!account,
    nftCount,
    tier,
    loading,
    balances,
    debugInfo,
  }
}
