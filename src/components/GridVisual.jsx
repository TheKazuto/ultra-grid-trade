import { Card, Tag } from './UI.jsx'
import { TOKENS } from '../lib/constants.js'

export function GridVisual({ levels, priceMin, priceMax, currentPrice, token }) {
  const tokenInfo = token ? TOKENS[token] : null
  const color = tokenInfo?.color || '#6c63ff'

  return (
    <Card style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700 }}>
          Active Grid Levels
        </h3>
        <Tag variant="accent">{levels.length} levels</Tag>
      </div>

      <div style={{
        position: 'relative',
        height: 140,
        background: 'rgba(108,99,255,0.03)',
        borderRadius: 10,
        border: '1px solid rgba(180,185,220,0.35)',
        overflow: 'hidden',
      }}>
        {levels.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9298b5', fontSize: 13 }}>
            Configure grid range and start bot
          </div>
        ) : (
          levels.map((price, i) => {
            const topPct = 100 - (i / (levels.length - 1)) * 100
            const isCurrent = currentPrice && Math.abs(price - currentPrice) < ((priceMax - priceMin) / (levels.length - 1)) * 0.7
            return (
              <div key={i} style={{
                position: 'absolute',
                left: 0, right: 0,
                top: `${topPct}%`,
                height: isCurrent ? 2 : 1,
                background: isCurrent ? color : 'rgba(160,170,210,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                transition: 'background 0.3s',
              }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isCurrent ? color : '#9298b5',
                  background: '#f0f2f8',
                  padding: '1px 5px',
                  borderRadius: 4,
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: isCurrent ? `0 0 0 2px ${color}22` : 'none',
                }}>
                  ${price < 1 ? price.toFixed(5) : price.toFixed(3)}
                </span>
                {isCurrent && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color, background: `${color}18`,
                    padding: '2px 7px', borderRadius: 4,
                    position: 'relative', zIndex: 1,
                  }}>
                    ← CURRENT
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}
