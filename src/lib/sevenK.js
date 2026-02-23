import { getQuote, buildTx, Config } from '@7kprotocol/sdk-ts'
import { SuiClient } from '@mysten/sui/client'

let initialized = false

function init7K() {
  if (!initialized) {
    const suiClient = new SuiClient({ url: 'https://mainnet.suiet.app' })
    Config.setSuiClient(suiClient)
    initialized = true
  }
}

// ============================================================
// GET PRICE — usa /api/prices (serverless, sem CORS)
// Usado pelo gridEngine.js
// ============================================================

// Mapa contrato → símbolo
const CONTRACT_TO_SYM = {
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI': 'SUI',
  '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL': 'WAL',
  '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP': 'DEEP',
  '0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA': 'IKA',
}

export async function get7KPrice(tokenContract) {
  try {
    const res = await fetch('/api/prices', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`/api/prices ${res.status}`)
    const data = await res.json()
    const sym = CONTRACT_TO_SYM[tokenContract]
    return sym && data[sym] != null ? parseFloat(data[sym]) : null
  } catch (err) {
    console.warn('[7K] get7KPrice failed:', err.message)
    return null
  }
}

export async function get7KPrices(tokenContracts) {
  try {
    const res = await fetch('/api/prices', { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`/api/prices ${res.status}`)
    const data = await res.json()
    const out = {}
    for (const contract of tokenContracts) {
      const sym = CONTRACT_TO_SYM[contract]
      if (sym && data[sym] != null) out[contract] = parseFloat(data[sym])
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
