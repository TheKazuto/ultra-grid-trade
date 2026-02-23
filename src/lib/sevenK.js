import { getQuote, buildTx, setSuiClient } from '@7kprotocol/sdk-ts'
import { suiClient } from './suiClient.js'

// ============================================================
// INITIALIZE 7K WITH OUR SUI CLIENT
// Called once when the app loads
// ============================================================
let initialized = false

export function init7K() {
  if (!initialized) {
    setSuiClient(suiClient)
    initialized = true
  }
}

// ============================================================
// GET QUOTE FROM 7K AGGREGATOR
// Finds best route across all DEXes on Sui
// ============================================================
export async function get7KQuote({
  tokenInContract,
  tokenOutContract,
  amountIn, // string in base units
}) {
  init7K()

  const quoteResponse = await getQuote({
    tokenIn: tokenInContract,
    tokenOut: tokenOutContract,
    amountIn: amountIn.toString(),
    // sources: [] means 7K uses ALL available DEXes automatically
    // which gives the best price across: cetus, turbos, aftermath,
    // deepbook, flowx, kriya, bluemove, suiswap, etc.
  })

  return quoteResponse
}

// ============================================================
// BUILD TRANSACTION FROM 7K QUOTE
// Returns a Transaction object ready to be signed
// ============================================================
export async function build7KTx({
  quoteResponse,
  walletAddress,
  slippage, // e.g. 0.005 = 0.5%
  partnerAddress, // your wallet to receive referral fees (optional, set 0 commission)
}) {
  init7K()

  const result = await buildTx({
    quoteResponse,
    accountAddress: walletAddress,
    slippage,
    commission: {
      partner: partnerAddress || walletAddress, // fallback to user's own address
      commissionBps: 0, // 0 = no fee taken
    },
  })

  return result // { tx, coinOut }
}

// ============================================================
// GET PRICE FROM 7K
// Uses 7K's price service to get token price in USD
// ============================================================
export async function get7KPrice(tokenContract) {
  try {
    init7K()
    // 7K price API endpoint
    const res = await fetch(
      `https://api.7k.ag/prices?coinTypes=${encodeURIComponent(tokenContract)}`
    )
    if (!res.ok) return null
    const data = await res.json()
    // Response: { "0x...::SUI": { price: 3.42 } }
    const key = Object.keys(data)[0]
    return data[key]?.price ?? null
  } catch (err) {
    console.warn('7K price fetch failed:', err.message)
    return null
  }
}
