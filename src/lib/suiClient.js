import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// NFT TYPE — exact type string from on-chain package
// ============================================================
const NFT_TYPE = `${NFT_PACKAGE_ID}::project_ultra::Nft`

// Kiosk types on Sui mainnet (standard + originbyte)
const KIOSK_TYPE    = '0x2::kiosk::Kiosk'
const OB_KIOSK_TYPE = '0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk::ObKiosk'

// ============================================================
// RPC FALLBACK LIST
// ============================================================
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
// HELPERS
// ============================================================

/** Returns true if the type string belongs to this NFT collection */
function isCollectionNFT(typeStr = '') {
  return (
    typeStr === NFT_TYPE ||
    typeStr.startsWith(NFT_PACKAGE_ID + '::')
  )
}

// ============================================================
// CHECK NFT OWNERSHIP
// Strategy (in order):
//   1. StructType filter — fastest, direct wallet objects
//   2. MoveModule filter — catches generic/wrapped types
//   3. Kiosk scan — NFTs locked inside standard Kiosks
//   4. OriginByte Kiosk scan — NFTs locked inside OB Kiosks
//   5. Full wallet scan — last resort
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  console.log('[NFT] Checking wallet:', walletAddress)
  console.log('[NFT] NFT type:', NFT_TYPE)

  try {
    // ── 1. StructType filter ──────────────────────────────────
    const byType = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: NFT_TYPE },
        options: { showType: true },
        limit: 50,
      })
    )
    console.log('[NFT] StructType result:', byType.data.length)
    if (byType.data.length > 0) {
      return { count: byType.data.length, nfts: byType.data, source: 'direct-type' }
    }

    // ── 2. MoveModule filter ──────────────────────────────────
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
    console.log('[NFT] MoveModule result:', byModule.data.length)
    if (byModule.data.length > 0) {
      return { count: byModule.data.length, nfts: byModule.data, source: 'move-module' }
    }

    // ── 3. Standard Kiosk scan ────────────────────────────────
    console.log('[NFT] Scanning standard Kiosks...')
    const kioskResult = await scanKiosks(walletAddress, KIOSK_TYPE)
    if (kioskResult.count > 0) {
      console.log('[NFT] Found in kiosk:', kioskResult.count)
      return { ...kioskResult, source: 'kiosk' }
    }

    // ── 4. OriginByte Kiosk scan ──────────────────────────────
    console.log('[NFT] Scanning OB Kiosks...')
    const obResult = await scanKiosks(walletAddress, OB_KIOSK_TYPE)
    if (obResult.count > 0) {
      console.log('[NFT] Found in OB kiosk:', obResult.count)
      return { ...obResult, source: 'ob-kiosk' }
    }

    // ── 5. Full wallet scan (last resort) ─────────────────────
    console.log('[NFT] Full wallet scan...')
    let all = [], cursor = null, hasNext = true

    while (hasNext && all.length < 3000) {
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

    const nfts = all.filter((o) => isCollectionNFT(o.data?.type || ''))
    console.log(`[NFT] Full scan: ${all.length} objects checked, ${nfts.length} matched`)
    return { count: nfts.length, nfts, source: 'full-scan' }

  } catch (err) {
    console.error('[NFT] Error:', err)
    return { count: 0, nfts: [], error: err.message }
  }
}

// ============================================================
// KIOSK SCANNER
// Finds all Kiosks owned by the wallet, then checks their
// dynamic fields for NFTs from our collection.
// ============================================================
async function scanKiosks(walletAddress, kioskType) {
  try {
    const kioskObjs = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: { StructType: kioskType },
        options: { showType: true },
        limit: 50,
      })
    )

    if (kioskObjs.data.length === 0) return { count: 0, nfts: [] }

    console.log(`[NFT] Found ${kioskObjs.data.length} kiosk(s) of type ${kioskType}`)

    let allNfts = []

    for (const kioskObj of kioskObjs.data) {
      const kioskId = kioskObj.data?.objectId
      if (!kioskId) continue

      let fields = [], cursor = null, hasNext = true
      while (hasNext) {
        const page = await withFallback((c) =>
          c.getDynamicFields({ parentId: kioskId, cursor, limit: 50 })
        )
        fields = [...fields, ...page.data]
        hasNext = page.hasNextPage
        cursor = page.nextCursor
      }

      console.log(`[NFT] Kiosk ${kioskId}: ${fields.length} dynamic field(s)`)

      const matching = fields.filter((f) => {
        const t = f.objectType || f.name?.type || ''
        return isCollectionNFT(t)
      })

      allNfts = [...allNfts, ...matching]
    }

    return { count: allNfts.length, nfts: allNfts }
  } catch (err) {
    console.warn('[NFT] Kiosk scan error:', err.message)
    return { count: 0, nfts: [] }
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
