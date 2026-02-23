import { Aftermath } from 'aftermath-ts-sdk'

// ============================================================
// AFTERMATH SDK - singleton, lazy initialized
// ============================================================
let afInstance = null
let initPromise = null

async function getAftermath() {
  if (afInstance) return afInstance
  if (initPromise) return initPromise

  initPromise = (async () => {
    const sdk = new Aftermath('MAINNET')
    await sdk.init()
    afInstance = sdk
    initPromise = null
    console.log('[Aftermath] SDK initialized')
    return sdk
  })()

  return initPromise
}

// ============================================================
// BUILD SWAP TRANSACTION via Aftermath Router
// ============================================================
export async function buildAftermathTx({
  walletAddress,
  tokenInContract,
  tokenOutContract,
  amountIn,   // BigInt in base units
  slippage,   // decimal, e.g. 0.005 for 0.5%
}) {
  const af = await getAftermath()
  const router = af.Router()

  const route = await router.getCompleteTradeRouteGivenAmountIn({
    coinInType: tokenInContract,
    coinOutType: tokenOutContract,
    coinInAmount: amountIn,
  })

  const txb = await router.getTransactionForCompleteTradeRoute({
    walletAddress,
    completeRoute: route,
    slippage,
  })

  return { txb, route }
}

// ============================================================
// GET PRICE FROM AFTERMATH — uses Prices SDK (correct API)
// route.coinOut is an object: { type, amount, tradeFee }
// To get implied price: coinOut.amount / coinIn.amount (adjusted for decimals)
// ============================================================
export async function getAftermathPrice(tokenContract, tokenDecimals, usdcDecimals = 6) {
  try {
    const af = await getAftermath()
    const prices = af.Prices()

    // getCoinPricesInUsd returns { [coinType]: priceInUsd }
    const result = await prices.getCoinPricesInUsd({ coins: [tokenContract] })
    if (result?.[tokenContract] != null) {
      return parseFloat(result[tokenContract])
    }
    return null
  } catch (err) {
    console.warn('[Aftermath] Price fetch failed:', err.message)
    return null
  }
}

// ============================================================
// GET MULTIPLE PRICES FROM AFTERMATH
// ============================================================
export async function getAftermathPrices(tokenContracts) {
  try {
    const af = await getAftermath()
    const prices = af.Prices()
    const result = await prices.getCoinPricesInUsd({ coins: tokenContracts })
    // result is { [coinType]: number }
    const out = {}
    for (const [coinType, price] of Object.entries(result || {})) {
      out[coinType] = price != null ? parseFloat(price) : null
    }
    return out
  } catch (err) {
    console.warn('[Aftermath] Multi-price fetch failed:', err.message)
    return {}
  }
}
