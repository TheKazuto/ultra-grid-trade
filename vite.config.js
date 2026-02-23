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
      // Em dev local, /api/prices vai direto para prices.7k.ag
      // Em produção na Vercel, é tratado pela function /api/prices.js
      '/api/prices': {
        target: 'https://prices.7k.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/prices/, '/price'),
      },
      '/api/7k': {
        target: 'https://api.7k.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/7k/, ''),
      },
    },
  },
})