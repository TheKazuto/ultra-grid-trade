import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// CONSTANTS
// ============================================================
const NFT_TYPE         = `${NFT_PACKAGE_ID}::project_ultra::Nft`
const KIOSK_OWNER_CAP  = '0x2::kiosk::KioskOwnerCap'
// Personal Kiosk wraps a KioskOwnerCap — also check for it
const PERSONAL_KIOSK_CAP = '0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802::personal_kiosk::PersonalKioskCap'

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

/** Returns true if the type string belongs to this NFT collection */
function isCollectionNFT(typeStr = '') {
  return (
    typeStr === NFT_TYPE ||
    typeStr.startsWith(NFT_PACKAGE_ID + '::')
  )
}

// ============================================================
// Paginate all owned objects matching a StructType filter
// ============================================================
async function getOwnedByType(owner, structType) {
  const results = []
  let cursor = null
  let hasNext = true
  while (hasNext) {
    const page = await withFallback((c) =>
      c.getOwnedObjects({
        owner,
        filter: { StructType: structType },
        options: { showType: true, showContent: true },
        cursor,
        limit: 50,
      })
    )
    results.push(...page.data)
    hasNext = page.hasNextPage
    cursor = page.nextCursor
  }
  return results
}

// ============================================================
// Paginate all dynamic fields of a parent object
// ============================================================
async function getAllDynamicFields(parentId) {
  const results = []
  let cursor = null
  let hasNext = true
  while (hasNext) {
    const page = await withFallback((c) =>
      c.getDynamicFields({ parentId, cursor, limit: 50 })
    )
    results.push(...page.data)
    hasNext = page.hasNextPage
    cursor = page.nextCursor
  }
  return results
}

// ============================================================
// CHECK NFT OWNERSHIP
//
// Strategy:
//   1. Direct wallet — StructType filter (NFT not in kiosk)
//   2. Direct wallet — MoveModule filter (fallback for #1)
//   3. Kiosk scan:
//      a. Find KioskOwnerCap(s) in wallet → get kiosk ID from
//         cap.fields.for  (the shared Kiosk object ID)
//      b. getDynamicFields on the shared Kiosk object
//      c. Match fields whose objectType contains our package
//   4. Full wallet scan — last resort
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
      return { count: byType.data.length, nfts: byType.data, source: 'direct' }
    }

    // ── 2. MoveModule filter ──────────────────────────────────
    const byModule = await withFallback((c) =>
      c.getOwnedObjects({
        owner: walletAddress,
        filter: { MoveModule: { package: NFT_PACKAGE_ID, module: 'project_ultra' } },
        options: { showType: true },
        limit: 50,
      })
    )
    console.log('[NFT] MoveModule result:', byModule.data.length)
    if (byModule.data.length > 0) {
      return { count: byModule.data.length, nfts: byModule.data, source: 'move-module' }
    }

    // ── 3. Kiosk scan ────────────────────────────────────────
    // The Kiosk itself is a SHARED object — it does NOT appear
    // in getOwnedObjects. What appears is the KioskOwnerCap.
    // The cap has a field "for" pointing to the kiosk ID.
    console.log('[NFT] Scanning KioskOwnerCap(s)...')

    const caps = await getOwnedByType(walletAddress, KIOSK_OWNER_CAP)
    console.log('[NFT] KioskOwnerCap found:', caps.length)

    // Also check PersonalKioskCap (wraps a KioskOwnerCap)
    let personalCaps = []
    try {
      personalCaps = await getOwnedByType(walletAddress, PERSONAL_KIOSK_CAP)
      console.log('[NFT] PersonalKioskCap found:', personalCaps.length)
    } catch (_) {}

    // Extract kiosk IDs from caps
    const kioskIds = new Set()

    for (const cap of caps) {
      // KioskOwnerCap.fields.for is the kiosk object ID
      const kioskId = cap.data?.content?.fields?.for
      if (kioskId) kioskIds.add(kioskId)
      // Sometimes the field is exposed directly as objectId of the kiosk
      // via showContent — also grab from type if available
    }

    for (const pcap of personalCaps) {
      // PersonalKioskCap wraps a KioskOwnerCap
      const inner = pcap.data?.content?.fields?.cap
      const kioskId = inner?.fields?.for || inner?.for
      if (kioskId) kioskIds.add(kioskId)
    }

    console.log('[NFT] Kiosk IDs to scan:', [...kioskIds])

    let kioskNfts = []

    for (const kioskId of kioskIds) {
      console.log(`[NFT] Scanning kiosk ${kioskId}...`)
      const fields = await getAllDynamicFields(kioskId)
      console.log(`[NFT] Kiosk ${kioskId}: ${fields.length} dynamic field(s)`)

      // Log all field types for debugging
      if (fields.length > 0) {
        const types = [...new Set(fields.map(f => f.objectType || 'unknown'))]
        console.log('[NFT] Field objectTypes:', types)
      }

      const matching = fields.filter((f) => {
        const objType = f.objectType || ''
        // objectType for a kiosk item is the full type of the stored object
        return isCollectionNFT(objType)
      })

      console.log(`[NFT] Kiosk ${kioskId}: ${matching.length} NFT(s) matched`)
      kioskNfts = [...kioskNfts, ...matching]
    }

    if (kioskNfts.length > 0) {
      return { count: kioskNfts.length, nfts: kioskNfts, source: 'kiosk' }
    }

    // ── 4. Full wallet scan (last resort) ─────────────────────
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
    console.log(`[NFT] Full scan: ${all.length} objects, ${nfts.length} matched`)
    return { count: nfts.length, nfts, source: 'full-scan' }

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
