import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit'
import { useNFT } from '../hooks/useNFT.js'

export function Navbar({ page, setPage }) {
  const account = useCurrentAccount()
  const { nftCount, tier } = useNFT()

  return (
    <nav style={styles.nav}>
      {/* Logo */}
      <div style={styles.logo} onClick={() => setPage('home')}>
        <div style={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span style={styles.logoText}>Ultra Grid Trade</span>
      </div>

      {/* Links */}
      <ul style={styles.links}>
        {['home', 'dashboard', 'account'].map((p) => (
          <li key={p}>
            <button
              onClick={() => setPage(p)}
              style={{
                ...styles.link,
                ...(page === p ? styles.linkActive : {}),
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          </li>
        ))}
      </ul>

      {/* Right side */}
      <div style={styles.right}>
        {account && (
          <div style={styles.tierPill}>
            🎫 {tier.label}
          </div>
        )}
        <ConnectButton />
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    height: 64,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px',
    background: 'rgba(240,242,248,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(180,185,220,0.35)',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800, fontSize: 17,
    letterSpacing: '-0.02em',
    cursor: 'pointer',
  },
  logoIcon: {
    width: 34, height: 34,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6c63ff 0%, #38bdf8 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#1a1d2e' },
  links: {
    display: 'flex', gap: 4, listStyle: 'none',
  },
  link: {
    background: 'transparent', border: 'none',
    fontSize: 14, fontWeight: 500, color: '#5a6080',
    padding: '7px 14px', borderRadius: 8,
    transition: 'all 0.2s', cursor: 'pointer',
  },
  linkActive: {
    color: '#6c63ff',
    background: 'rgba(108,99,255,0.08)',
  },
  right: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  tierPill: {
    padding: '5px 12px',
    borderRadius: 20,
    background: 'rgba(108,99,255,0.10)',
    border: '1px solid rgba(108,99,255,0.25)',
    fontSize: 12.5,
    fontWeight: 600,
    color: '#6c63ff',
  },
}
