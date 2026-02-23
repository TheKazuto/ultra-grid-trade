// ============================================================
// CARD
// ============================================================
export function Card({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{ ...cardStyle, ...style }}>
      {children}
    </div>
  )
}

const cardStyle = {
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(180,185,220,0.35)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 32px rgba(108,99,255,0.10), 0 1.5px 6px rgba(0,0,0,0.04)',
}

// ============================================================
// TAG
// ============================================================
export function Tag({ children, variant = 'accent' }) {
  const colors = {
    accent: { bg: 'rgba(108,99,255,0.10)', color: '#6c63ff' },
    blue:   { bg: 'rgba(56,189,248,0.10)',  color: '#38bdf8' },
    green:  { bg: 'rgba(34,197,94,0.10)',   color: '#22c55e' },
    red:    { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444' },
    amber:  { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b' },
    gray:   { bg: 'rgba(146,152,181,0.10)', color: '#9298b5' },
  }
  const c = colors[variant] || colors.accent
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11.5, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {children}
    </span>
  )
}

// ============================================================
// STAT CARD
// ============================================================
export function StatCard({ label, value, change, changePositive }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#9298b5', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#1a1d2e' }}>
        {value}
      </div>
      {change && (
        <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, color: changePositive ? '#22c55e' : '#ef4444' }}>
          {change}
        </div>
      )}
    </Card>
  )
}

// ============================================================
// BUTTON PRIMARY
// ============================================================
export function BtnPrimary({ children, onClick, style = {}, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '13px 0',
        borderRadius: 10, border: 'none',
        background: disabled
          ? 'rgba(108,99,255,0.3)'
          : 'linear-gradient(135deg, #6c63ff 0%, #38bdf8 100%)',
        color: 'white',
        fontSize: 15, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.18s, transform 0.18s',
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(108,99,255,0.3)',
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.target.style.opacity = '0.88' }}
      onMouseLeave={(e) => { e.target.style.opacity = '1' }}
    >
      {children}
    </button>
  )
}

// ============================================================
// BUTTON SECONDARY
// ============================================================
export function BtnSecondary({ children, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '11px 0',
        borderRadius: 10,
        border: '1.5px solid rgba(160,170,210,0.5)',
        background: 'transparent',
        color: '#5a6080',
        fontSize: 14, fontWeight: 500,
        transition: 'all 0.18s',
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#6c63ff'; e.currentTarget.style.color = '#6c63ff' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(160,170,210,0.5)'; e.currentTarget.style.color = '#5a6080' }}
    >
      {children}
    </button>
  )
}

// ============================================================
// FORM INPUT
// ============================================================
export function FormInput({ label, value, onChange, placeholder, suffix, type = 'number', min, max, step }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <div style={{ fontSize: 11.5, fontWeight: 600, color: '#5a6080', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min} max={max} step={step}
          style={{
            width: '100%',
            padding: suffix ? '10px 52px 10px 14px' : '10px 14px',
            borderRadius: 10,
            border: '1.5px solid rgba(180,185,220,0.35)',
            background: 'rgba(255,255,255,0.6)',
            fontSize: 14, color: '#1a1d2e',
            outline: 'none',
            transition: 'border-color 0.18s, box-shadow 0.18s',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#6c63ff'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.12)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(180,185,220,0.35)'; e.target.style.boxShadow = 'none' }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9298b5', pointerEvents: 'none' }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================
// DIVIDER
// ============================================================
export function Divider() {
  return <div style={{ height: 1, background: 'rgba(180,185,220,0.35)', margin: '2px 0' }} />
}

// ============================================================
// LOADING SPINNER
// ============================================================
export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      border: '2.5px solid rgba(108,99,255,0.2)',
      borderTopColor: '#6c63ff',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ============================================================
// TOAST
// ============================================================
export function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 72, right: 24,
      zIndex: 9999,
      background: 'white',
      borderRadius: 12,
      padding: '14px 20px',
      boxShadow: '0 12px 48px rgba(108,99,255,0.15), 0 2px 12px rgba(0,0,0,0.06)',
      borderLeft: '4px solid #6c63ff',
      fontSize: 14, fontWeight: 500,
      maxWidth: 320,
      transform: visible ? 'translateX(0)' : 'translateX(140%)',
      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      pointerEvents: 'none',
    }}>
      {message}
    </div>
  )
}
