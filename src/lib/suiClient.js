import { SuiClient } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// SUI CLIENT - public RPCs with automatic fallback
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
// CHECK NFT OWNERSHIP
// 3 strategies in order of speed
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  try {
    // Strategy 1: Package filter
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

    // Strategy 2: MoveModule filter — tries common module names
    const moduleNames = ['nft', 'ultra_grid_nft', 'grid_nft', 'pass', 'access', 'token']
    for (const moduleName of moduleNames) {
      try {
        const byModule = await withFallback((client) =>
          client.getOwnedObjects({
            owner: walletAddress,
            filter: {
              MoveModule: {
                package: NFT_PACKAGE_ID,
                module: moduleName,
              },
            },
            options: { showType: true },
            limit: 50,
          })
        )
        if (byModule.data.length > 0) {
          console.log(`[NFT] Found ${byModule.data.length} via MoveModule (${moduleName})`)
          return { count: byModule.data.length, nfts: byModule.data }
        }
      } catch {}
    }

    // Strategy 3: Full scan with type prefix match
    console.log('[NFT] Filters returned 0, falling back to full scan...')
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

    console.log(`[NFT] Full scan found ${nfts.length} objects matching package ID`)
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
