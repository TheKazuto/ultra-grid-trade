import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

const RPC_URLS = [
  getFullnodeUrl('mainnet'),
  'https://sui-mainnet.public.blastapi.io',
  'https://sui-mainnet-rpc.allthatnode.com',
]

export const suiClient = new SuiClient({ url: RPC_URLS[0] })

async function withFallback(fn) {
  let lastErr
  for (const url of RPC_URLS) {
    try {
      return await fn(new SuiClient({ url }))
    } catch (err) {
      lastErr = err
      console.warn(`[RPC] ${url} failed:`, err.message)
    }
  }
  throw lastErr
}

// ============================================================
// CHECK NFT OWNERSHIP
// Strategy 1: Package filter
// Strategy 2: MoveModule filter (tries common module names)
// Strategy 3: Full wallet scan matching package ID prefix
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  console.log('[NFT] Checking wallet:', walletAddress)
  console.log('[NFT] Package ID:', NFT_PACKAGE_ID)

  try {
    // Strategy 1: Package filter
    const byPkg = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: { Package: NFT_PACKAGE_ID },
        options: { showType: true },
        limit: 50,
      })
    )
    console.log('[NFT] Package filter:', byPkg.data.length, 'result(s)')
    if (byPkg.data.length > 0) {
      return { count: byPkg.data.length, nfts: byPkg.data }
    }

    // Strategy 2: MoveModule filter
    for (const mod of ['nft', 'pass', 'access', 'badge', 'grid', 'ultra', 'token', 'item', 'member']) {
      try {
        const res = await withFallback((c) =>
          c.getOwnedObjects({
            owner: walletAddress,
            filter: { MoveModule: { package: NFT_PACKAGE_ID, module: mod } },
            options: { showType: true },
            limit: 50,
          })
        )
        if (res.data.length > 0) {
          console.log(`[NFT] MoveModule::${mod}:`, res.data.length, 'result(s)')
          return { count: res.data.length, nfts: res.data }
        }
      } catch {}
    }

    // Strategy 3: Full wallet scan
    console.log('[NFT] Starting full wallet scan...')
    let all = [], cursor = null, hasNext = true
    while (hasNext && all.length < 1000) {
      const page = await withFallback((c) =>
        c.getOwnedObjects({
          owner: walletAddress,
          options: { showType: true },
          cursor, limit: 50,
        })
      )
      all = [...all, ...page.data]
      hasNext = page.hasNextPage
      cursor = page.nextCursor
    }

    // Log ALL object types so we can debug from the console
    console.log('[NFT] All object types in wallet:')
    all.forEach((o) => {
      if (o.data?.type) console.log(' -', o.data.type)
    })

    const nfts = all.filter((o) => (o.data?.type || '').startsWith(NFT_PACKAGE_ID))
    console.log(`[NFT] Full scan: ${all.length} total, ${nfts.length} match package`)
    return { count: nfts.length, nfts }

  } catch (err) {
    console.error('[NFT] Error:', err)
    return { count: 0, nfts: [], error: err.message }
  }
}

// ============================================================
// GET ALL BALANCES
// ============================================================
export async function getAllBalances(walletAddress) {
  try {
    const balances = await withFallback((c) => c.getAllBalances({ owner: walletAddress }))
    const result = {}
    for (const b of balances) {
      result[b.coinType] = BigInt(b.totalBalance)
    }
    return result
  } catch (err) {
    console.error('[Balances] Error:', err)
    return {}
  }
}

export async function getTokenBalance(walletAddress, coinType) {
  try {
    const b = await withFallback((c) => c.getBalance({ owner: walletAddress, coinType }))
    return BigInt(b.totalBalance)
  } catch {
    return 0n
  }
}
