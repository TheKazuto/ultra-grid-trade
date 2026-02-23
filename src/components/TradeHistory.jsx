import { Card, Tag } from './UI.jsx'

export function TradeHistory({ trades }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '18px 22px',
        borderBottom: '1px solid rgba(180,185,220,0.35)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 }}>
          Trade History
        </h3>
        <Tag variant={trades.length > 0 ? 'blue' : 'gray'}>
          {trades.length} trade{trades.length !== 1 ? 's' : ''}
        </Tag>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Time', 'Side', 'Price', 'Amount', 'Total (USDC)', 'Via', 'Tx'].map((h) => (
                <th key={h} style={{
                  padding: '10px 18px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: '#9298b5',
                  borderBottom: '1px solid rgba(180,185,220,0.35)',
                  background: 'rgba(0,0,0,0.02)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} style={{
                  textAlign: 'center', padding: '32px 18px',
                  color: '#9298b5', fontSize: 13,
                }}>
                  No trades yet — start the bot to begin
                </td>
              </tr>
            ) : (
              trades.slice(0, 30).map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(180,185,220,0.12)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108,99,255,0.025)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 18px', color: '#5a6080' }}>{t.time}</td>
                  <td style={{ padding: '11px 18px', fontWeight: 600, color: t.side === 'BUY' ? '#22c55e' : '#ef4444' }}>
                    {t.side}
                  </td>
                  <td style={{ padding: '11px 18px' }}>${parseFloat(t.price).toFixed(5)}</td>
                  <td style={{ padding: '11px 18px' }}>{t.amount} {t.token}</td>
                  <td style={{ padding: '11px 18px', fontWeight: 500 }}>${t.total}</td>
                  <td style={{ padding: '11px 18px' }}>
                    <Tag variant={t.via === 'Aftermath' ? 'accent' : 'blue'}>{t.via}</Tag>
                  </td>
                  <td style={{ padding: '11px 18px' }}>
                    {t.digest ? (
                      <a
                        href={`https://suiscan.xyz/mainnet/tx/${t.digest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#6c63ff', fontSize: 11, fontFamily: 'monospace' }}
                      >
                        {t.digest.slice(0, 8)}…
                      </a>
                    ) : (
                      <span style={{ color: '#9298b5', fontSize: 11 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
