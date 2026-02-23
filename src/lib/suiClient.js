import { SuiClient } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// SUI CLIENT - multiple public RPCs with automatic fallback
// ============================================================
const RPC_URLS = [
  'https://fullnode.mainnet.sui.io',
  'https://sui-mainnet.public.blastapi.io',
  'https://sui-mainnet-rpc.allthatnode.com',
]

export const suiClient = new SuiClient({ url: RPC_URLS[0] })

async function withFallback(fn) {
  let lastErr
  for (const url of RPC_URLS) {
    try {
      const client = new SuiClient({ url })
      return await fn(client)
    } catch (err) {
      lastErr = err
      console.warn(`[RPC] ${url} failed, trying next...`, err.message)
    }
  }
  throw lastErr
}

// ============================================================
// CHECK NFT OWNERSHIP - 2 strategies
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  try {
    // Strategy 1: Package filter (fast)
    const byPackage = await withFallback((client) =>
      client.getOwnedObjects({
        owner: walletAddress,
        filter: { Package: NFT_PACKAGE_ID },
        options: { showType: true },
        limit: 50,
      })
    )

    if (byPackage.data.length > 0) {
      console.log(`[NFT] Found ${byPackage.data.length} via Package filter`)
      return { count: byPackage.data.length, nfts: byPackage.data }
    }

    // Strategy 2: Scan all objects, match type prefix
    console.log('[NFT] Package filter = 0, doing full scan...')
    let allObjects = []
    let cursor = null
    let hasNextPage = true

    while (hasNextPage) {
      const page = await withFallback((client) =>
        client.getOwnedObjects({
          owner: walletAddress,
          options: { showType: true },
          cursor,
          limit: 50,
        })
      )
      allObjects = [...allObjects, ...page.data]
      hasNextPage = page.hasNextPage
      cursor = page.nextCursor
      if (allObjects.length >= 500) break
    }

    const nfts = allObjects.filter((obj) => {
      const type = obj.data?.type || ''
      return type.startsWith(NFT_PACKAGE_ID)
    })

    console.log(`[NFT] Found ${nfts.length} via full scan`)
    return { count: nfts.length, nfts }

  } catch (err) {
    console.error('[NFT] checkNFTOwnership error:', err)
    return { count: 0, nfts: [], error: err.message }
  }
}

// ============================================================
// GET TOKEN BALANCE
// ============================================================
export async function getTokenBalance(walletAddress, coinType) {
  try {
    const balance = await withFallback((client) =>
      client.getBalance({ owner: walletAddress, coinType })
    )
    return BigInt(balance.totalBalance)
  } catch {
    return 0n
  }
}

// ============================================================
// GET ALL BALANCES
// ============================================================
export async function getAllBalances(walletAddress) {
  try {
    const balances = await withFallback((client) =>
      client.getAllBalances({ owner: walletAddress })
    )
    const result = {}
    for (const b of balances) {
      result[b.coinType] = BigInt(b.totalBalance)
    }
    return result
  } catch (err) {
    console.error('[Balances] getAllBalances error:', err)
    return {}
  }
}
