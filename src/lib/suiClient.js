import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// SUI CLIENT (singleton connected to Mainnet)
// ============================================================
export const suiClient = new SuiClient({
  url: getFullnodeUrl('mainnet'),
})

// ============================================================
// CHECK NFT OWNERSHIP
// Reads all objects owned by the wallet that belong to
// the Ultra Grid Trade collection package.
// ============================================================
export async function checkNFTOwnership(walletAddress) {
  try {
    let allNFTs = []
    let cursor = null
    let hasNextPage = true

    // Paginate through owned objects (Sui returns max 50 per page)
    while (hasNextPage) {
      const response = await suiClient.getOwnedObjects({
        owner: walletAddress,
        filter: {
          Package: NFT_PACKAGE_ID,
        },
        options: {
          showType: true,
          showContent: false,
        },
        cursor,
        limit: 50,
      })

      allNFTs = [...allNFTs, ...response.data]
      hasNextPage = response.hasNextPage
      cursor = response.nextCursor
    }

    return { count: allNFTs.length, nfts: allNFTs }
  } catch (err) {
    console.error('NFT check failed:', err)
    return { count: 0, nfts: [], error: err.message }
  }
}

// ============================================================
// GET TOKEN BALANCE
// ============================================================
export async function getTokenBalance(walletAddress, coinType) {
  try {
    const balance = await suiClient.getBalance({
      owner: walletAddress,
      coinType,
    })
    return BigInt(balance.totalBalance)
  } catch {
    return 0n
  }
}

// ============================================================
// GET ALL BALANCES FOR DASHBOARD
// ============================================================
export async function getAllBalances(walletAddress) {
  try {
    const balances = await suiClient.getAllBalances({ owner: walletAddress })
    const result = {}
    for (const b of balances) {
      result[b.coinType] = BigInt(b.totalBalance)
    }
    return result
  } catch {
    return {}
  }
}
