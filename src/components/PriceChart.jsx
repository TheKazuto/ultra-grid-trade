import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TOKENS } from '../lib/constants.js'
import { Card, Tag } from './UI.jsx'

// history prop: flat array of price numbers e.g. [1.23, 1.25, ...]
// Parent (DashboardPage) already passes priceHistory[selectedToken] — DO NOT re-index
export function PriceChart({ token, history, currentPrice }) {
  const tokenInfo = token ? TOKENS[token] : null
  const color = tokenInfo?.color || '#6c63ff'

  const safeHistory = Array.isArray(history) ? history : []
  const data = safeHistory.map((price, i) => ({
    i,
    price: parseFloat(Number(price).toFixed(6)),
  }))

  return (
    <Card style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700 }}>
            Price Chart — {token ? `${token} / USDC` : 'Select a token'}
          </h3>
          {currentPrice && (
            <div style={{ fontSize: 13, color: '#5a6080', marginTop: 2 }}>
              Live: <strong style={{ color }}>${currentPrice.toFixed(5)}</strong>
            </div>
          )}
        </div>
        {token && <Tag variant="accent">{token} / USDC</Tag>}
      </div>

      <div style={{ height: 160 }}>
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${token}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="i" hide />
              <YAxis
                domain={['auto', 'auto']}
                hide
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(180,185,220,0.4)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                }}
                formatter={(v) => [`$${v}`, 'Price']}
                labelFormatter={() => ''}
              />
              <Area
                type="monotoneX"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${token})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9298b5', fontSize: 13 }}>
            {token ? 'Collecting price data…' : 'Select a token to see the chart'}
          </div>
        )}
      </div>
    </Card>
  )
}
