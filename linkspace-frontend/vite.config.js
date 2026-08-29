import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" && repoName ? `/${repoName}/` : "/",
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
