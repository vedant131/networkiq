import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // GitHub Pages base path
  base: '/networkiq/',

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },

  define: {
    // process.env reads system env vars (set by GitHub Actions secrets)
    // loadEnv only reads .env files — won't work in CI
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ''),
  },
})
