import { Aftermath } from 'aftermath-ts-sdk'

// ============================================================
// AFTERMATH SDK - singleton, lazy initialized
// ============================================================
let afInstance = null
let initPromise = null

async function getAftermath() {
  if (afInstance) return afInstance

  // Prevent multiple simultaneous inits
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
// FETCH PRICE FROM AFTERMATH
// ============================================================
export async function getAftermathPrice(tokenContract) {
  try {
    const af = await getAftermath()
    const prices = af.Prices()
    const result = await prices.getCoinPricesInUsd({ coins: [tokenContract] })
    if (result?.[tokenContract]) return result[tokenContract]
    return null
  } catch (err) {
    console.warn('[Aftermath] Price fetch failed:', err.message)
    return null
  }
}
