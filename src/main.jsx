import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import '@mysten/dapp-kit/dist/index.css'
import './styles/global.css'
import App from './App.jsx'

// ============================================================
// REACT QUERY CLIENT
// Required by @mysten/dapp-kit for wallet state management
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 10_000,
    },
  },
})

// ============================================================
// SUI NETWORK CONFIG
// mainnet = production, change to 'testnet' for testing
// ============================================================
const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
      QueryClientProvider: manages async state (wallet queries, etc.)
      SuiClientProvider: connects to the Sui blockchain
      WalletProvider:    handles wallet connection (Sui Wallet, Suiet, Martian, etc.)
        autoConnect: true means it reconnects on page refresh
    */}
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="mainnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
