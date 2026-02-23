import { getQuote, buildTx, Config, getTokenPrice, getTokenPrices } from '@7kprotocol/sdk-ts'
import { SuiClient } from '@mysten/sui/client'
import { NFT_PACKAGE_ID } from './constants.js'

// ============================================================
// 7K SDK - correct initialization via Config (v2 API)
// ============================================================
let initialized = false

function init7K() {
  if (!initialized) {
    // v2 API: Config.setSuiClient() instead of the old setSuiClient()
    const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io' })
    Config.setSuiClient(client)
    initialized = true
    console.log('[7K] SDK initialized via Config')
  }
}

// ============================================================
// GET QUOTE FROM 7K AGGREGATOR
// ============================================================
export async function get7KQuote({ tokenInContract, tokenOutContract, amountIn }) {
  init7K()
  const quote = await getQuote({
    tokenIn: tokenInContract,
    tokenOut: tokenOutContract,
    amountIn: amountIn.toString(),
  })
  return quote
}

// ============================================================
// BUILD TRANSACTION FROM 7K QUOTE
// ============================================================
export async function build7KTx({ quoteResponse, walletAddress, slippage, partnerAddress }) {
  init7K()
  const result = await buildTx({
    quoteResponse,
    accountAddress: walletAddress,
    slippage,
    commission: {
      // partner is required even at 0 bps — needed for analytics
      partner: partnerAddress || walletAddress,
      commissionBps: 0,
    },
  })
  return result
}

// ============================================================
// GET PRICE FROM 7K — uses native SDK function (no CORS issues)
// ============================================================
export async function get7KPrice(tokenContract) {
  try {
    init7K()
    const price = await getTokenPrice(tokenContract)
    return price ? parseFloat(price) : null
  } catch (err) {
    console.warn('[7K] Price fetch failed:', err.message)
    return null
  }
}

// ============================================================
// GET MULTIPLE PRICES FROM 7K
// ============================================================
export async function get7KPrices(tokenContracts) {
  try {
    init7K()
    const prices = await getTokenPrices(tokenContracts)
    // Returns { [coinType]: price }
    const result = {}
    for (const [coinType, price] of Object.entries(prices)) {
      result[coinType] = price ? parseFloat(price) : null
    }
    return result
  } catch (err) {
    console.warn('[7K] Multi-price fetch failed:', err.message)
    return {}
  }
}
