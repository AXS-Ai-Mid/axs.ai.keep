import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// HMR through remote preview proxies (e.g. *.e2b.app) needs an explicit
// client port/protocol, because the browser page is served over https/443
// while the dev server listens on 5173.
const hmrClientPort = process.env.HMR_CLIENT_PORT ? Number(process.env.HMR_CLIENT_PORT) : undefined
const hmrHost = process.env.HMR_HOST || undefined

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow any host header so sandbox/preview proxies can reach the dev server.
    allowedHosts: true,
    hmr: hmrClientPort ? { clientPort: hmrClientPort, protocol: 'wss', host: hmrHost } : undefined,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
