import { useCurrentAccount } from '@mysten/dapp-kit'
import { ConnectButton } from '@mysten/dapp-kit'
import { Card, Tag, Spinner } from '../components/UI.jsx'
import { TOKENS, USDC, NFT_PACKAGE_ID } from '../lib/constants.js'

export function AccountPage({ nft }) {
  const account = useCurrentAccount()
  const { nftCount, tier, balances, loading, debugInfo } = nft

  if (!account) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👛</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Not Connected</h2>
        <p style={{ color: '#5a6080', fontSize: 14, marginBottom: 20 }}>Connect your wallet to view account details.</p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 70 }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 24 }}>
        Account
      </h1>

      {/* Wallet */}
      <Card style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={labelStyle}>Wallet Address</div>
            <div style={{ fontSize: 12.5, fontFamily: 'monospace', fontWeight: 500, marginTop: 6, wordBreak: 'break-all', color: '#1a1d2e' }}>
              {account.address}
            </div>
          </div>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0, marginLeft: 16 }} />
        </div>
        <a
          href={`https://suiscan.xyz/mainnet/account/${account.address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, color: '#6c63ff', fontWeight: 500 }}
        >
          View on Suiscan ↗
        </a>
      </Card>

      {/* NFT Holdings */}
      <Card style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={labelStyle}>NFT Holdings</div>
          {loading && <Spinner size={16} />}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9298b5', fontSize: 14 }}>
            <Spinner size={16} /> Scanning wallet for NFTs…
          </div>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
              {nftCount > 0
                ? `✅ ${nftCount} Ultra Grid Trade NFT${nftCount !== 1 ? 's' : ''} found`
                : '❌ No NFTs found in this wallet'}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <Tag variant={tier.allowed ? 'accent' : 'red'}>{tier.label}</Tag>
              <Tag variant={tier.maxPairs >= 2 ? 'blue' : 'gray'}>
                {tier.maxPairs} pair{tier.maxPairs !== 1 ? 's' : ''} max
              </Tag>
            </div>

            {/* Debug info — visible only if there's an issue */}
            {debugInfo && (
              <div style={{ fontSize: 11.5, color: '#9298b5', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 8 }}>
                🔍 {debugInfo}
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: 12, color: '#9298b5' }}>
              <strong style={{ color: '#5a6080' }}>Collection Package ID:</strong>
              <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4 }}>{NFT_PACKAGE_ID}</div>
            </div>
          </>
        )}
      </Card>

      {/* Token Balances */}
      <Card style={{ padding: '22px 24px', marginBottom: 16 }}>
        <div style={labelStyle}>Token Balances</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {[...Object.values(TOKENS), { symbol: 'USDC', color: '#2775CA' }].map((token) => (
            <div key={token.symbol} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.02)', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: token.color || '#2775CA' }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{token.symbol}</span>
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15 }}>
                {loading ? '…' : (
                  balances[token.symbol] != null
                    ? balances[token.symbol].toFixed(token.symbol === 'USDC' ? 2 : 4)
                    : '0.0000'
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Contract Addresses */}
      <Card style={{ padding: '22px 24px' }}>
        <div style={labelStyle}>Contract Addresses</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {[...Object.values(TOKENS), { symbol: 'USDC', contract: USDC.contract }].map((token) => (
            <div key={token.symbol}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6080', display: 'block', marginBottom: 3 }}>
                {token.symbol}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#9298b5', wordBreak: 'break-all' }}>
                {token.contract}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

const labelStyle = {
  fontSize: 11.5, fontWeight: 600, color: '#9298b5',
  textTransform: 'uppercase', letterSpacing: '0.07em',
}
