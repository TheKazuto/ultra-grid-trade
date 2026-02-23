import { getQuote, buildTx, Config, getTokenPrice, getTokenPrices } from '@7kprotocol/sdk-ts'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

let initialized = false

function init7K() {
  if (!initialized) {
    const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') })
    Config.setSuiClient(suiClient)
    initialized = true
  }
}

// ============================================================
// GET PRICE (single token) — uses SDK directly, no proxy needed
// ============================================================
export async function get7KPrice(tokenContract) {
  try {
    init7K()
    const price = await getTokenPrice(tokenContract)
    return price != null ? parseFloat(price) : null
  } catch (err) {
    console.warn('[7K] get7KPrice failed:', err.message)
    return null
  }
}

// ============================================================
// GET PRICES (multiple tokens) — uses SDK getTokenPrices
// Returns: { [coinType]: number }
// ============================================================
export async function get7KPrices(tokenContracts) {
  try {
    init7K()
    const results = await getTokenPrices(tokenContracts)
    // SDK returns array of { coinType, price } or object
    const out = {}
    if (Array.isArray(results)) {
      for (const item of results) {
        if (item?.coinType && item?.price != null) {
          out[item.coinType] = parseFloat(item.price)
        }
      }
    } else if (results && typeof results === 'object') {
      for (const [coinType, price] of Object.entries(results)) {
        if (price != null) out[coinType] = parseFloat(price)
      }
    }
    return out
  } catch (err) {
    console.warn('[7K] get7KPrices failed:', err.message)
    return {}
  }
}

// ============================================================
// GET QUOTE
// ============================================================
export async function get7KQuote({ tokenInContract, tokenOutContract, amountIn }) {
  init7K()
  return getQuote({
    tokenIn: tokenInContract,
    tokenOut: tokenOutContract,
    amountIn: amountIn.toString(),
  })
}

// ============================================================
// BUILD TX
// ============================================================
export async function build7KTx({ quoteResponse, walletAddress, slippage, partnerAddress }) {
  init7K()
  return buildTx({
    quoteResponse,
    accountAddress: walletAddress,
    slippage,
    commission: {
      partner: partnerAddress || walletAddress,
      commissionBps: 0,
    },
  })
}
