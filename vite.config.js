import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['rikipath.app.edu.vn', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:5266',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5266',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
