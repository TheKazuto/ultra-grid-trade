import { Aftermath } from 'aftermath-ts-sdk'

// Singleton SDK instance
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
    return sdk
  })()
  return initPromise
}

// ============================================================
// GET PRICE (single coin) — uses getCoinPrice per official docs
// ============================================================
export async function getAftermathPrice(coinType) {
  const af = await getAftermath()
  const prices = af.Prices()
  // Official API: getCoinPrice({ coin }) → number
  const price = await prices.getCoinPrice({ coin: coinType })
  return price != null ? parseFloat(price) : null
}

// ============================================================
// GET PRICES (multiple coins) — uses getCoinsToPrice per official docs
// ============================================================
export async function getAftermathPrices(coinTypes) {
  const af = await getAftermath()
  const prices = af.Prices()
  // Official API: getCoinsToPrice({ coins }) → Record<CoinType, number>
  const result = await prices.getCoinsToPrice({ coins: coinTypes })
  const out = {}
  for (const [coinType, price] of Object.entries(result || {})) {
    out[coinType] = price != null ? parseFloat(price) : null
  }
  return out
}

// ============================================================
// BUILD SWAP TRANSACTION via Aftermath Router
// ============================================================
export async function buildAftermathTx({
  walletAddress,
  tokenInContract,
  tokenOutContract,
  amountIn,
  slippage,
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
