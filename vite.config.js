import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': '/src',
    },
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    include: [
      '@mysten/dapp-kit',
      'aftermath-ts-sdk',
      '@7kprotocol/sdk-ts',
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // ⚠️ REMOVIDO @mysten/sui daqui — ele não tem export "." raiz
          'dapp-kit':       ['@mysten/dapp-kit'],
          'aftermath-sdk':  ['aftermath-ts-sdk'],
          'sevenkprotocol': ['@7kprotocol/sdk-ts'],
          'charts':         ['recharts'],
        },
      },
    },
  },
  server: {
    proxy: {
      // Em dev local, /api/prices chama CoinGecko diretamente
      // Em produção Vercel, é servido pela serverless function /api/prices.js
      '/api/prices': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        rewrite: () => '/api/v3/simple/price?ids=sui,walrus-2,deep-book,ika-network&vs_currencies=usd',
      },
      '/api/7k': {
        target: 'https://api.7k.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/7k/, ''),
      },
    },
  },
})