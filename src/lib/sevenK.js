import { getQuote, buildTx, Config } from '@7kprotocol/sdk-ts'
import { SuiClient } from '@mysten/sui/client'

let initialized = false

function init7K() {
  if (!initialized) {
    // Usa RPC com CORS ok — não usar getFullnodeUrl('mainnet')
    const suiClient = new SuiClient({ url: 'https://mainnet.suiet.app' })
    Config.setSuiClient(suiClient)
    initialized = true
  }
}

// ============================================================
// GET PRICE (single token) — busca via Binance, sem CORS
// Usado pelo gridEngine.js
// ============================================================
export async function get7KPrice(tokenContract) {
  // Mapa de contrato → par Binance
  const BINANCE_MAP = {
    '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': 'SUIUSDT',
    '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL': 'WALUSDT',
    '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP': 'DEEPUSDT',
  }
  const pair = BINANCE_MAP[tokenContract]
  if (pair) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        return parseFloat(data.price)
      }
    } catch (_) {}
  }
  // Fallback: CoinGecko
  const CG_MAP = {
    '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': 'sui',
    '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL': 'walrus-2',
    '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP': 'deep-book',
    '0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA': 'ika-network',
  }
  const cgId = CG_MAP[tokenContract]
  if (cgId) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(8000) }
      )
      if (res.ok) {
        const data = await res.json()
        return data[cgId]?.usd ?? null
      }
    } catch (_) {}
  }
  return null
}

// ============================================================
// GET PRICES (múltiplos tokens) — wrapper para get7KPrice
// ============================================================
export async function get7KPrices(tokenContracts) {
  const results = await Promise.allSettled(tokenContracts.map(get7KPrice))
  const out = {}
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value != null) out[tokenContracts[i]] = r.value
  })
  return out
}

// ============================================================
// GET QUOTE — usa o SDK do 7K (só para swaps, não para preços)
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
