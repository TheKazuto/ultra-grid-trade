import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Required for some blockchain SDKs that use Node.js globals
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these dependencies correctly
    include: [
      '@mysten/sui',
      '@mysten/dapp-kit',
      'aftermath-ts-sdk',
      '@7kprotocol/sdk-ts',
    ],
  },
  build: {
    // Increase chunk size limit warning threshold
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split large vendor libraries into separate chunks for faster loading
        manualChunks: {
          'sui-sdk':      ['@mysten/sui', '@mysten/dapp-kit'],
          'aftermath-sdk': ['aftermath-ts-sdk'],
          'sevenkprotocol': ['@7kprotocol/sdk-ts'],
          'charts':       ['recharts'],
        },
      },
    },
  },
  server: {
    // Local dev proxy to avoid CORS issues when testing
    proxy: {
      '/api/7k': {
        target: 'https://api.7k.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/7k/, ''),
      },
    },
  },
})
