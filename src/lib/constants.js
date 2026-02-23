// ============================================================
// TOKEN CONTRACTS — Sui Mainnet
// ============================================================
export const TOKENS = {
  SUI: {
    symbol: 'SUI',
    name: 'Sui',
    contract: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    decimals: 9,
    color: '#627EEA',
    initial: 'S',
  },
  WAL: {
    symbol: 'WAL',
    name: 'Walrus',
    contract: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
    decimals: 9,
    color: '#FF6B35',
    initial: 'W',
  },
  DEEP: {
    symbol: 'DEEP',
    name: 'DeepBook',
    // Confirmed via DeepBookV3 indexer & on-chain data
    contract: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
    decimals: 6,
    color: '#1DB954',
    initial: 'D',
    // CoinGecko ID — correct slug for DEEP token
    cgId: 'deep-book',
  },
  IKA: {
    symbol: 'IKA',
    name: 'Ika',
    contract: '0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA',
    decimals: 9,
    color: '#9B59B6',
    initial: 'I',
    cgId: 'ika',
  },
}

// Add cgId to all tokens for CoinGecko fallback
TOKENS.SUI.cgId  = 'sui'
TOKENS.WAL.cgId  = 'walrus-2'

export const USDC = {
  symbol: 'USDC',
  contract: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  decimals: 6,
}

// ============================================================
// NFT COLLECTION
// ============================================================
export const NFT_PACKAGE_ID =
  '0x29b63e7dc8cc62e747ae113c724f73f4fdb6c95fc7d10decd5309c415554a0f8'

// Tier rules
export const getTier = (nftCount) => {
  if (nftCount === 0) return { allowed: false, maxPairs: 0, label: 'No Access', sub: 'You need at least 1 NFT' }
  if (nftCount >= 10) return { allowed: true, maxPairs: 2, label: 'Pro Tier', sub: `${nftCount} NFTs — 2 trading pairs` }
  return { allowed: true, maxPairs: 1, label: 'Standard Tier', sub: `${nftCount} NFT${nftCount > 1 ? 's' : ''} — 1 trading pair` }
}

// ============================================================
// DECIMALS HELPERS
// ============================================================
export const toBaseUnits = (amount, decimals) =>
  BigInt(Math.floor(parseFloat(amount) * 10 ** decimals))

export const fromBaseUnits = (amount, decimals) =>
  Number(amount) / 10 ** decimals

// ============================================================
// APR CALCULATION
// ============================================================
export const calcAPR = ({ priceMin, priceMax, gridCount, mode }) => {
  if (!priceMin || !priceMax || priceMin >= priceMax || gridCount < 2) return null
  const spacing = (priceMax - priceMin) / (gridCount - 1)
  const mid = (priceMin + priceMax) / 2
  const gridProfitPct = spacing / mid
  const modeMultiplier = { conservative: 0.7, balanced: 1.0, aggressive: 1.4 }[mode] || 1
  const tradesPerDay = modeMultiplier * 3.5
  const dailyReturn = gridProfitPct * tradesPerDay
  const apr = dailyReturn * 365 * 100
  const perGrid = (gridProfitPct * 100).toFixed(3)
  return { apr: apr.toFixed(1), perGrid }
}

// ============================================================
// GRID LEVELS
// ============================================================
export const calcGridLevels = (priceMin, priceMax, count) => {
  if (!priceMin || !priceMax || priceMin >= priceMax || count < 2) return []
  return Array.from({ length: count }, (_, i) => {
    const price = priceMin + ((priceMax - priceMin) / (count - 1)) * i
    return +price.toFixed(6)
  })
}

// ============================================================
// TRADE HISTORY ITEM
// ============================================================
export const makeTrade = ({ side, price, amount, token, via, digest }) => ({
  id: Date.now() + Math.random(),
  time: new Date().toLocaleTimeString(),
  side,
  price,
  amount,
  total: (price * amount).toFixed(4),
  token,
  status: 'Filled',
  via,
  digest,
})
