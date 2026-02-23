import { useCurrentAccount } from '@mysten/dapp-kit'
import { ConnectButton } from '@mysten/dapp-kit'
import { Card, Tag } from '../components/UI.jsx'

export function HomePage({ setPage, nft }) {
  const account = useCurrentAccount()
  const { nftCount, tier, loading } = nft

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Hero */}
      <div className="fade-in" style={{ textAlign: 'center', padding: '60px 0 50px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 'clamp(34px,5vw,62px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          background: 'linear-gradient(135deg, #6c63ff 0%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 18,
        }}>
          Automated Grid Trading<br />on Sui Network
        </h1>
        <p style={{ fontSize: 17, color: '#5a6080', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Set your range, define your grids, and let the bot handle the rest.
          Powered by Aftermath Finance &amp; 7K Aggregator — exclusive to NFT holders.
        </p>
        {!account && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectButton />
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="fade-in-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16, marginBottom: 40 }}>
        {[
          { icon: '⚡', color: 'rgba(108,99,255,0.12)', title: 'Linear Grid Strategy', desc: 'Equal-spaced grid levels with automatic rebalancing when price exits your range.' },
          { icon: '🛡️', color: 'rgba(56,189,248,0.12)', title: 'Delegated Signing', desc: 'Limited delegated signing — the bot never has full custody of your assets.' },
          { icon: '📈', color: 'rgba(34,197,94,0.12)',  title: 'Best Price Routing', desc: 'Routes through Aftermath DEX and 7K Aggregator for optimal fills.' },
          { icon: '🎫', color: 'rgba(245,158,11,0.12)', title: 'NFT-Gated Access', desc: 'Exclusive to Ultra Grid Trade NFT holders. More NFTs unlock more pairs.' },
        ].map((c) => (
          <Card key={c.title} style={{ padding: 24, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
            className="hover-lift"
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>
              {c.icon}
            </div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{c.title}</h3>
            <p style={{ fontSize: 13.5, color: '#5a6080', lineHeight: 1.55 }}>{c.desc}</p>
          </Card>
        ))}
      </div>

      {/* NFT Verify card */}
      <div className="fade-in-2" style={{ maxWidth: 440, margin: '0 auto' }}>
        <Card style={{ padding: 36, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #6c63ff, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 20px',
          }}>
            🎫
          </div>

          {!account ? (
            <>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Verify NFT Ownership
              </h2>
              <p style={{ fontSize: 14, color: '#5a6080', lineHeight: 1.55, marginBottom: 28 }}>
                Connect your Sui wallet to verify your NFT holdings and unlock access to the grid trading bot.
              </p>
              <ConnectButton />
            </>
          ) : loading ? (
            <p style={{ color: '#9298b5', fontSize: 14 }}>Checking NFT holdings…</p>
          ) : tier.allowed ? (
            <>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#22c55e' }}>
                ✅ Access Granted!
              </h2>
              <p style={{ fontSize: 14, color: '#5a6080', marginBottom: 20 }}>
                {tier.sub} — you're ready to start trading.
              </p>
              <button
                onClick={() => setPage('dashboard')}
                style={{
                  padding: '13px 32px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#6c63ff,#38bdf8)',
                  color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(108,99,255,0.3)',
                }}
              >
                Open Bot Dashboard →
              </button>
            </>
          ) : (
            <>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#ef4444' }}>
                No NFT Found
              </h2>
              <p style={{ fontSize: 14, color: '#5a6080', lineHeight: 1.55 }}>
                You need at least 1 Ultra Grid Trade NFT to access the bot. Get one from the collection to unlock trading.
              </p>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <Tag variant="accent">1 NFT → 1 trading pair</Tag>
            <Tag variant="blue">10 NFTs → 2 trading pairs</Tag>
          </div>
        </Card>
      </div>
    </div>
  )
}
