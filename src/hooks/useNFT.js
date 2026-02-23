import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { checkNFTOwnership, getAllBalances } from '../lib/suiClient.js'
import { getTier, TOKENS, USDC, fromBaseUnits } from '../lib/constants.js'

// ============================================================
// useNFT — watches the connected wallet and checks NFT balance
// ============================================================
export function useNFT() {
  const account = useCurrentAccount()
  const [nftCount, setNftCount] = useState(0)
  const [tier, setTier] = useState(getTier(0))
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState({})

  useEffect(() => {
    if (!account?.address) {
      setNftCount(0)
      setTier(getTier(0))
      setBalances({})
      return
    }

    setLoading(true)

    Promise.all([
      checkNFTOwnership(account.address),
      getAllBalances(account.address),
    ]).then(([nftResult, rawBalances]) => {
      const count = nftResult.count
      setNftCount(count)
      setTier(getTier(count))

      // Parse balances to human-readable numbers
      const parsed = {}
      Object.entries(rawBalances).forEach(([coinType, raw]) => {
        // Match known tokens
        for (const [sym, token] of Object.entries(TOKENS)) {
          if (coinType === token.contract) {
            parsed[sym] = fromBaseUnits(raw, token.decimals)
          }
        }
        if (coinType === USDC.contract) {
          parsed['USDC'] = fromBaseUnits(raw, USDC.decimals)
        }
      })
      setBalances(parsed)
    }).catch(console.error).finally(() => setLoading(false))
  }, [account?.address])

  return {
    address: account?.address,
    connected: !!account,
    nftCount,
    tier,
    loading,
    balances,
  }
}
