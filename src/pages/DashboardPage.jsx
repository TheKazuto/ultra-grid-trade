import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { StatCard } from '../components/UI.jsx'
import { BotConfigPanel } from '../components/BotConfigPanel.jsx'
import { PriceChart } from '../components/PriceChart.jsx'
import { GridVisual } from '../components/GridVisual.jsx'
import { TradeHistory } from '../components/TradeHistory.jsx'
import { useGridBot } from '../hooks/useGridBot.js'
import { useNFT } from '../hooks/useNFT.js'

export function DashboardPage({ prices, priceHistory }) {
  const account = useCurrentAccount()
  const { tier, balances } = useNFT()
  const [selectedToken, setSelectedToken] = useState(null)

  const {
    running, startBot, stopBot, resetBot,
    currentPrice, pnl, volume, trades,
    levels, priceMin, priceMax,
    lastError, lastRebalance,
  } = useGridBot()

  const handleTokenSelect = (sym) => {
    setSelectedToken(sym)
  }

  const handleStart = (config) => {
    setSelectedToken(config.token)
    startBot({ ...config, walletAddress: account?.address })
  }

  if (!account) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Wallet Not Connected
        </h2>
        <p style={{ color: '#5a6080', fontSize: 14 }}>Connect your wallet on the Home page to access the dashboard.</p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 70 }}>
      {lastError && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16, fontSize: 13.5, color: '#ef4444' }}>
          ⚠️ {lastError}
        </div>
      )}
      {lastRebalance && (
        <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, color: '#f59e0b' }}>
          🔄 Grid rebalanced at {lastRebalance}
        </div>
      )}

      <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Current Price"  value={currentPrice != null ? `$${currentPrice.toFixed(5)}` : '$—'} />
        <StatCard label="Estimated APR"  value="—%" change="annualized" />
        <StatCard
          label="PNL (Current)"
          value={`${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`}
          change="since start"
          changePositive={pnl >= 0}
        />
        <StatCard label="Trade Volume" value={`$${volume.toFixed(2)}`} change="total traded" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* history is flat array: priceHistory[selectedToken] */}
          <PriceChart
            token={selectedToken}
            history={selectedToken ? (priceHistory[selectedToken] || []) : []}
            currentPrice={currentPrice ?? (selectedToken ? prices[selectedToken] : null)}
          />
          <GridVisual
            levels={levels}
            priceMin={priceMin}
            priceMax={priceMax}
            currentPrice={currentPrice}
            token={selectedToken}
          />
          <TradeHistory trades={trades} />
        </div>

        <BotConfigPanel
          running={running}
          onStart={handleStart}
          onStop={stopBot}
          onReset={resetBot}
          onTokenSelect={handleTokenSelect}
          tier={tier}
          walletConnected={!!account}
          balances={balances}
          prices={prices}
        />
      </div>
    </div>
  )
}
