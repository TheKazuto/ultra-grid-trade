import { Aftermath } from 'aftermath-ts-sdk'
import { fromBaseUnits, toBaseUnits } from './constants.js'

// ============================================================
// AFTERMATH SDK
// Single instance reused across all trade calls
// ============================================================
let afInstance = null

async function getAftermath() {
  if (!afInstance) {
    afInstance = new Aftermath('MAINNET')
    await afInstance.init()
  }
  return afInstance
}

// ============================================================
// GET TRADE QUOTE VIA AFTERMATH ROUTER
// Returns the route object and the expected amount out (USDC)
// ============================================================
export async function getAftermathQuote({
  tokenInContract,
  tokenOutContract,
  amountIn, // BigInt in base units
}) {
  const af = await getAftermath()
  const router = af.Router()

  const route = await router.getCompleteTradeRouteGivenAmountIn({
    coinInType: tokenInContract,
    coinOutType: tokenOutContract,
    coinInAmount: amountIn,
  })

  return route
}

// ============================================================
// BUILD AFTERMATH TRANSACTION
// Returns a TransactionBlock ready to be signed by the wallet
// ============================================================
export async function buildAftermathTx({
  walletAddress,
  tokenInContract,
  tokenOutContract,
  amountIn, // BigInt
  slippage, // e.g. 0.005 for 0.5%
}) {
  const af = await getAftermath()
  const router = af.Router()

  // Step 1: Get best route
  const route = await router.getCompleteTradeRouteGivenAmountIn({
    coinInType: tokenInContract,
    coinOutType: tokenOutContract,
    coinInAmount: amountIn,
  })

  // Step 2: Build signed transaction
  const txb = await router.getTransactionForCompleteTradeRoute({
    walletAddress,
    completeRoute: route,
    slippage,
  })

  return { txb, route }
}

// ============================================================
// FETCH PRICE FROM AFTERMATH
// Returns price of a token in USDC
// ============================================================
export async function getAftermathPrice(tokenContract, usdcContract) {
  try {
    const af = await getAftermath()
    const prices = af.Prices()
    const result = await prices.getCoinPricesInUsd({ coins: [tokenContract] })
    if (result && result[tokenContract]) {
      return result[tokenContract]
    }
    return null
  } catch (err) {
    console.warn('Aftermath price fetch failed:', err.message)
    return null
  }
}
