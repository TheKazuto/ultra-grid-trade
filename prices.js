// Vercel Serverless Function — proxy para prices.7k.ag
// Resolve o bloqueio de CORS do browser ao chamar prices.7k.ag diretamente.
// URL de acesso: /api/prices?coinType=0x...

export default async function handler(req, res) {
  // Preflight CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Repassa todos os query params para prices.7k.ag/price
    const params = new URLSearchParams(req.query).toString()
    const upstream = `https://prices.7k.ag/price${params ? `?${params}` : ''}`

    const response = await fetch(upstream, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream error: ${response.status}` })
    }

    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=20')
    return res.status(200).json(data)

  } catch (err) {
    console.error('[proxy/prices] Error:', err.message)
    return res.status(502).json({ error: err.message })
  }
}
