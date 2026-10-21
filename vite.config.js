import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:5265';
  return {
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['rikipath.app.edu.vn', 'localhost'],
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/hubs': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  };
})
