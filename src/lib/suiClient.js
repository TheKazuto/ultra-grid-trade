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
// The Package filter on Sui only works for objects whose type
// is directly under that package root. Many NFT collections
// use nested modules (e.g. package::collection::NFT).
// So we do a full wallet scan and match by package prefix —
// this is the most reliable method.
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  console.log('[NFT] Scanning wallet:', walletAddress)
  console.log('[NFT] Looking for package:', NFT_PACKAGE_ID)

  try {
    // Full wallet scan — paginate through ALL owned objects
    let allObjects = []
    let cursor = null
    let hasNextPage = true

    while (hasNextPage) {
      const page = await withFallback((c) =>
        c.getOwnedObjects({
          owner: walletAddress,
          options: { showType: true },
          cursor,
          limit: 50,
        })
      )
      allObjects = [...allObjects, ...page.data]
      hasNextPage = page.hasNextPage
      cursor = page.nextCursor

      // Safety cap at 2000 objects
      if (allObjects.length >= 2000) break
    }

    console.log('[NFT] Total objects in wallet:', allObjects.length)

    // Log every object type so we can debug from the console
    const types = allObjects
      .map((o) => o.data?.type)
      .filter(Boolean)

    console.log('[NFT] All object types:')
    types.forEach((t) => console.log('  -', t))

    // Match anything whose type starts with our package ID
    const nfts = allObjects.filter((o) => {
      const type = o.data?.type || ''
      return type.startsWith(NFT_PACKAGE_ID)
    })

    console.log(`[NFT] Found ${nfts.length} NFT(s) matching package`)
    nfts.forEach((n) => console.log('  ✓', n.data?.type, n.data?.objectId))

    return { count: nfts.length, nfts }

  } catch (err) {
    console.error('[NFT] Error during scan:', err)
    return { count: 0, nfts: [], error: err.message }
  }
}

// ============================================================
// GET ALL BALANCES
// ============================================================
export async function getAllBalances(walletAddress) {
  try {
    const balances = await withFallback((c) =>
      c.getAllBalances({ owner: walletAddress })
    )
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
    const b = await withFallback((c) =>
      c.getBalance({ owner: walletAddress, coinType })
    )
    return BigInt(b.totalBalance)
  } catch {
    return 0n
  }
}
