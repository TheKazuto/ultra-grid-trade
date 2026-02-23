// Vercel Serverless Function — busca preços no servidor (sem CORS)
// GET /api/prices → { SUI: 1.23, WAL: 0.45, DEEP: 0.06, IKA: 0.01 }

const CG_IDS = {
  SUI:  'sui',
  WAL:  'walrus-2',
  DEEP: 'deep-book',
  IKA:  'ika-network',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=12, stale-while-revalidate=30')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const ids = Object.values(CG_IDS).join(',')
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' } }
    )

    if (!response.ok) throw new Error(`CoinGecko ${response.status}`)

    const data = await response.json()
    const out = {}
    for (const [sym, cgId] of Object.entries(CG_IDS)) {
      if (data[cgId]?.usd != null) out[sym] = data[cgId].usd
    }

    return res.status(200).json(out)
  } catch (err) {
    console.error('[api/prices] Error:', err.message)
    return res.status(502).json({ error: err.message })
  }
}
