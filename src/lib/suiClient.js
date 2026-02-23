import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// Exact type string from SuiScan collection URL
const NFT_TYPE = `${NFT_PACKAGE_ID}::project_ultra::Nft`

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
// Uses StructType filter with the exact type from SuiScan:
// 0x29b63e...::project_ultra::Nft
// This is the most reliable and fastest method.
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  console.log('[NFT] Checking wallet:', walletAddress)
  console.log('[NFT] NFT type:', NFT_TYPE)

  try {
    // Primary: StructType filter — exact match on the NFT type
    const byType = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: NFT_TYPE },
        options: { showType: true },
        limit: 50,
      })
    )

    console.log('[NFT] StructType filter result:', byType.data.length)

    if (byType.data.length > 0) {
      return { count: byType.data.length, nfts: byType.data }
    }

    // Fallback: MoveModule filter with known module name
    const byModule = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: {
          MoveModule: {
            package: NFT_PACKAGE_ID,
            module: 'project_ultra',
          },
        },
        options: { showType: true },
        limit: 50,
      })
    )

    console.log('[NFT] MoveModule filter result:', byModule.data.length)

    if (byModule.data.length > 0) {
      return { count: byModule.data.length, nfts: byModule.data }
    }

    // Last resort: full scan
    console.log('[NFT] Falling back to full wallet scan...')
    let all = [], cursor = null, hasNext = true

    while (hasNext && all.length < 2000) {
      const page = await withFallback((c) =>
        c.getOwnedObjects({
          owner: walletAddress,
          options: { showType: true },
          cursor,
          limit: 50,
        })
      )
      all = [...all, ...page.data]
      hasNext = page.hasNextPage
      cursor = page.nextCursor
    }

    const nfts = all.filter((o) => {
      const t = o.data?.type || ''
      return t === NFT_TYPE || t.startsWith(NFT_PACKAGE_ID)
    })

    console.log(`[NFT] Full scan: ${all.length} total, ${nfts.length} matched`)
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
