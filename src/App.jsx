import { useState } from 'react'
import { Navbar } from './components/Navbar.jsx'
import { BottomBar } from './components/BottomBar.jsx'
import { Toast } from './components/UI.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { AccountPage } from './pages/AccountPage.jsx'
import { usePrices } from './hooks/usePrices.js'

export default function App() {
  const [page, setPage] = useState('home')
  const [toast, setToast] = useState({ msg: '', visible: false })
  const { prices, history: priceHistory } = usePrices()

  // Global toast helper
  window.showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 3500)
  }

  return (
    <>
      <Navbar page={page} setPage={setPage} />

      <main style={{
        position: 'relative', zIndex: 1,
        padding: '88px 24px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {page === 'home' && <HomePage setPage={setPage} />}
        {page === 'dashboard' && <DashboardPage prices={prices} priceHistory={priceHistory} />}
        {page === 'account' && <AccountPage />}
      </main>

      <BottomBar prices={prices} running={false} />
      <Toast message={toast.msg} visible={toast.visible} />
    </>
  )
}
