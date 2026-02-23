import { TOKENS } from '../lib/constants.js'

export function BottomBar({ prices, running }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: '9px 24px',
      background: 'rgba(240,242,248,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(180,185,220,0.35)',
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.values(TOKENS).map((token) => (
          <div key={token.symbol} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(180,185,220,0.35)',
            fontSize: 13,
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: token.color }} />
            <span style={{ fontWeight: 700, color: '#1a1d2e' }}>{token.symbol}</span>
            <span style={{ color: '#5a6080' }}>
              {prices[token.symbol] != null
                ? `$${prices[token.symbol] < 1 ? prices[token.symbol].toFixed(5) : prices[token.symbol].toFixed(3)}`
                : '…'}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9298b5' }}>
        {running && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#22c55e', fontWeight: 600, fontSize: 12.5,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#22c55e',
              animation: 'pulse 1.5s infinite',
              display: 'inline-block',
            }} />
            Bot Running
          </span>
        )}
        <span>🟢 All Systems Operational · Aftermath + 7K</span>
      </div>
    </div>
  )
}
