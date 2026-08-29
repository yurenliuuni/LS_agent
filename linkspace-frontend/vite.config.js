import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/LS_v0/" : "/",
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:8000',
      '/games': 'http://localhost:8000',
      '/vision': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
