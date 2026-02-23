import { getQuote, buildTx, Config } from '@7kprotocol/sdk-ts'
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
// GET PRICE — calls our Vercel proxy instead of prices.7k.ag
// directly (which is blocked by CORS in the browser)
// ============================================================
export async function get7KPrice(tokenContract) {
  try {
    const res = await fetch(
      `/proxy/7k-prices/price?coinType=${encodeURIComponent(tokenContract)}`
    )
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    // Response shape: { price: "1.23" } or { [coinType]: { price: "1.23" } }
    const price = data?.price ?? data?.[tokenContract]?.price
    return price != null ? parseFloat(price) : null
  } catch (err) {
    console.warn('[7K] get7KPrice failed:', err.message)
    return null
  }
}

// ============================================================
// GET MULTIPLE PRICES — calls proxy for each contract
// ============================================================
export async function get7KPrices(tokenContracts) {
  try {
    const params = tokenContracts
      .map((c) => `coinType=${encodeURIComponent(c)}`)
      .join('&')
    const res = await fetch(`/proxy/7k-prices/price?${params}`)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()

    const out = {}
    for (const contract of tokenContracts) {
      // Try both shapes the API might return
      const price = data?.[contract]?.price ?? data?.price
      if (price != null) out[contract] = parseFloat(price)
    }
    return out
  } catch (err) {
    console.warn('[7K] get7KPrices failed:', err.message)
    return {}
  }
}

// ============================================================
// GET QUOTE — uses the SDK (goes through 7K's quote endpoint)
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
