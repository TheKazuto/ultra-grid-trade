import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: [
      { find: '@', replacement: '/src' },
      {
        find: /^@mysten\/sui(\/(.*))?$/,
        replacement: (_, sub) =>
          sub
            ? path.resolve('node_modules/@mysten/sui/dist/cjs/' + sub + '.js')
            : path.resolve('node_modules/@mysten/sui/dist/cjs/index.js'),
      },
    ],
  },
  optimizeDeps: {
    include: [
      '@mysten/sui',
      '@mysten/dapp-kit',
      'aftermath-ts-sdk',
      '@7kprotocol/sdk-ts',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      include: [/@mysten\/sui/, /@mysten\/dapp-kit/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'sui-sdk':        ['@mysten/sui', '@mysten/dapp-kit'],
          'aftermath-sdk':  ['aftermath-ts-sdk'],
          'sevenkprotocol': ['@7kprotocol/sdk-ts'],
          'charts':         ['recharts'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/7k': {
        target: 'https://api.7k.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/7k/, ''),
      },
    },
  },
})
