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
// GET PRICES — chama /api/prices (Vercel serverless proxy)
// evitando o bloqueio de CORS do browser em prices.7k.ag
// Retorna: { [coinType]: number }
// ============================================================
export async function get7KPrices(tokenContracts) {
  const params = tokenContracts
    .map((c) => `coinType=${encodeURIComponent(c)}`)
    .join('&')

  const res = await fetch(`/api/prices?${params}`, {
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`prices proxy ${res.status}`)

  const data = await res.json()
  const out = {}

  for (const contract of tokenContracts) {
    // A API do 7K retorna { [coinType]: { price: "1.23" } }
    const priceRaw = data?.[contract]?.price ?? data?.[contract]
    if (priceRaw != null) out[contract] = parseFloat(priceRaw)
  }

  return out
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
