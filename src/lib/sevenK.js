import { getQuote, buildTx, setSuiClient } from '@7kprotocol/sdk-ts'
import { suiClient } from './suiClient.js'

let initialized = false

function init7K() {
  if (!initialized) {
    setSuiClient(suiClient)
    initialized = true
    console.log('[7K] SDK initialized')
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
      partner: partnerAddress || walletAddress,
      commissionBps: 0,
    },
  })
  return result
}

// ============================================================
// GET PRICE FROM 7K  (used by bot engine tick)
// ============================================================
export async function get7KPrice(tokenContract) {
  try {
    init7K()
    const res = await fetch(
      `https://api.7k.ag/prices?coinTypes=${encodeURIComponent(tokenContract)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    const values = Object.values(data)
    return values[0]?.price ? parseFloat(values[0].price) : null
  } catch (err) {
    console.warn('[7K] Price fetch failed:', err.message)
    return null
  }
}
