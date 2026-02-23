import { useState } from 'react'
import { Card, BtnPrimary, BtnSecondary, FormInput, Tag, Divider } from './UI.jsx'
import { TOKENS, calcAPR } from '../lib/constants.js'

const TOKEN_LIST = Object.values(TOKENS)
const MODES = [
  { id: 'conservative', label: '🐢 Conservative' },
  { id: 'balanced',     label: '⚖️ Balanced' },
  { id: 'aggressive',   label: '🚀 Aggressive' },
]

export function BotConfigPanel({
  running,
  onStart,
  onStop,
  onReset,
  onTokenSelect,
  tier,
  walletConnected,
  balances,
  prices,
}) {
  const [token, setToken] = useState(null)
  const [dex, setDex] = useState('aftermath')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [gridCount, setGridCount] = useState('10')
  const [capital, setCapital] = useState('')
  const [slippage, setSlippage] = useState('0.5')
  const [mode, setMode] = useState('balanced')

  // Auto-fill price range when token is selected
  const handleSelectToken = (sym) => {
    setToken(sym)
    onTokenSelect?.(sym)   // notifica o Dashboard imediatamente para mostrar chart
    const p = prices[sym]
    if (p && !priceMin && !priceMax) {
      setPriceMin((p * 0.88).toFixed(5))
      setPriceMax((p * 1.12).toFixed(5))
    }
  }

  // APR estimate
  const aprData = calcAPR({
    priceMin: parseFloat(priceMin),
    priceMax: parseFloat(priceMax),
    gridCount: parseInt(gridCount),
    mode,
  })

  // Validation
  const canStart =
    walletConnected &&
    tier.allowed &&
    token &&
    parseFloat(priceMin) > 0 &&
    parseFloat(priceMax) > parseFloat(priceMin) &&
    parseInt(gridCount) >= 2 &&
    parseFloat(capital) >= 10

  const handleStart = () => {
    if (!canStart) return
    onStart({ token, dex, priceMin, priceMax, gridCount, capitalUsdc: capital, slippage, mode })
  }

  return (
    <Card style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid rgba(180,185,220,0.35)' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>Bot Configuration</h2>
        <p style={{ fontSize: 12.5, color: '#9298b5', marginTop: 3 }}>Linear Grid · USDC base · Delegated Signing</p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Tier badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 10,
          background: tier.allowed ? 'rgba(108,99,255,0.06)' : 'rgba(239,68,68,0.05)',
          border: `1px dashed ${tier.allowed ? 'rgba(108,99,255,0.3)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          <span style={{ fontSize: 20 }}>🎫</span>
          <div>
            <strong style={{ fontSize: 13, fontWeight: 600, color: tier.allowed ? '#6c63ff' : '#ef4444', display: 'block' }}>
              {tier.label}
            </strong>
            <span style={{ fontSize: 11.5, color: '#9298b5' }}>{tier.sub}</span>
          </div>
        </div>

        {/* Wallet balance */}
        {walletConnected && balances.USDC !== undefined && (
          <div style={{ fontSize: 12.5, color: '#5a6080', background: 'rgba(34,197,94,0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.15)' }}>
            💰 USDC Balance: <strong style={{ color: '#22c55e' }}>${balances.USDC?.toFixed(2) ?? '—'}</strong>
          </div>
        )}

        {/* Token selector */}
        <div>
          <div style={labelStyle}>Trading Token</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
            {TOKEN_LIST.map((t) => (
              <button
                key={t.symbol}
                onClick={() => handleSelectToken(t.symbol)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${token === t.symbol ? t.color : 'rgba(180,185,220,0.35)'}`,
                  background: token === t.symbol ? `${t.color}14` : 'transparent',
                  fontSize: 13.5, fontWeight: 600,
                  color: token === t.symbol ? t.color : '#5a6080',
                  transition: 'all 0.18s', cursor: 'pointer',
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {t.initial}
                </div>
                {t.symbol}
                {prices[t.symbol] && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9298b5', fontWeight: 400 }}>
                    ${prices[t.symbol] < 1 ? prices[t.symbol].toFixed(4) : prices[t.symbol].toFixed(3)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* DEX selector */}
        <div>
          <div style={labelStyle}>Routing</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
            {[
              { id: 'aftermath', label: '🌊 Aftermath', color: '#6c63ff' },
              { id: '7k',        label: '⚡ 7K Aggregator', color: '#38bdf8' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDex(d.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${dex === d.id ? d.color : 'rgba(180,185,220,0.35)'}`,
                  background: dex === d.id ? `${d.color}10` : 'transparent',
                  fontSize: 13, fontWeight: 500,
                  color: dex === d.id ? d.color : '#5a6080',
                  transition: 'all 0.18s', cursor: 'pointer',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* Price range */}
        <div>
          <div style={labelStyle}>Grid Price Range</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 7 }}>
            <FormInput value={priceMin} onChange={setPriceMin} placeholder="Min $" suffix="USDC" />
            <FormInput value={priceMax} onChange={setPriceMax} placeholder="Max $" suffix="USDC" />
          </div>
          {parseFloat(priceMin) > 0 && parseFloat(priceMax) > parseFloat(priceMin) && parseInt(gridCount) >= 2 && (
            <div style={{ fontSize: 11.5, color: '#9298b5', marginTop: 6 }}>
              Spacing: ${((parseFloat(priceMax) - parseFloat(priceMin)) / (parseInt(gridCount) - 1)).toFixed(5)} per grid
            </div>
          )}
        </div>

        {/* Grid count */}
        <FormInput label="Number of Grids (2–50)" value={gridCount} onChange={setGridCount} placeholder="10" min="2" max="50" />

        {/* Capital */}
        <FormInput label="Total Capital" value={capital} onChange={setCapital} placeholder="e.g. 500" suffix="USDC" />

        {/* Slippage slider */}
        <div>
          <div style={labelStyle}>
            Max Slippage — <span style={{ color: '#6c63ff' }}>{parseFloat(slippage).toFixed(1)}%</span>
          </div>
          <input
            type="range" min="0.1" max="1" step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            style={{ width: '100%', accentColor: '#6c63ff', cursor: 'pointer', marginTop: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9298b5', marginTop: 4 }}>
            <span>0.1%</span><span>1.0%</span>
          </div>
        </div>

        {/* Mode */}
        <div>
          <div style={labelStyle}>Bot Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 7, background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  padding: '8px 4px', borderRadius: 8, border: 'none',
                  background: mode === m.id ? 'white' : 'transparent',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  color: mode === m.id ? '#6c63ff' : '#9298b5',
                  boxShadow: mode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.18s',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* APR estimate */}
        {aprData && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(56,189,248,0.08))',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#9298b5', fontWeight: 500 }}>Estimated APR</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: '#22c55e' }}>
                {aprData.apr}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#9298b5' }}>Per grid profit</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#5a6080' }}>{aprData.perGrid}% / fill</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div style={{ padding: '16px 24px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!running ? (
          <BtnPrimary onClick={handleStart} disabled={!canStart}>
            🚀 Start Bot
          </BtnPrimary>
        ) : (
          <BtnPrimary
            onClick={onStop}
            style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}
          >
            ⏸ Pause Bot
          </BtnPrimary>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <BtnSecondary onClick={() => {
            const config = { token, dex, priceMin, priceMax, gridCount, capitalUsdc: capital, slippage, mode }
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = 'grid-config.json'
            a.click()
          }}>
            📋 Export Config
          </BtnSecondary>
          <button
            onClick={onReset}
            style={{
              padding: '11px 0', borderRadius: 10,
              border: '1.5px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: '#ef4444',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.18s',
            }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(239,68,68,0.06)' }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent' }}
          >
            ⛔ Stop & Reset
          </button>
        </div>

        {!walletConnected && (
          <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9298b5', marginTop: 4 }}>
            Connect your wallet to start trading
          </p>
        )}
        {walletConnected && !tier.allowed && (
          <p style={{ textAlign: 'center', fontSize: 12.5, color: '#ef4444', marginTop: 4 }}>
            ⚠️ No NFT found — you need at least 1 NFT to use this bot
          </p>
        )}
      </div>
    </Card>
  )
}

const labelStyle = {
  fontSize: 11.5, fontWeight: 600, color: '#5a6080',
  textTransform: 'uppercase', letterSpacing: '0.06em',
}
