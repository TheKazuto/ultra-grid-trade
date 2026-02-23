// Vercel Serverless Function — proxy para prices.7k.ag
// Resolve o bloqueio de CORS do browser ao chamar prices.7k.ag diretamente.
//
// IMPORTANTE: múltiplos coinType na URL chegam como array em req.query.coinType
// Ex: ?coinType=0xABC&coinType=0xDEF → req.query.coinType = ['0xABC', '0xDEF']
// Precisamos reconstruir a query string corretamente para o upstream.

export const config = {
  runtime: 'edge', // Edge runtime: mais rápido, sem cold start, suporta fetch nativo
}

export default async function handler(req) {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    // Pega a query string original da requisição e repassa direto
    // Isso preserva múltiplos coinType sem nenhuma transformação
    const url = new URL(req.url)
    const upstreamUrl = `https://prices.7k.ag/price${url.search}`

    const response = await fetch(upstreamUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://app.7k.ag',
        'Referer': 'https://app.7k.ag/',
      },
    })

    const text = await response.text()

    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=10, stale-while-revalidate=20',
      },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}
