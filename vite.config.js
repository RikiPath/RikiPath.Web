import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const appRoot = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, appRoot, '');
  const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:5265';
  return {
  root: appRoot,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom'],
  },
  // Pre-bundle deps that only lazy routes import, so the first visit to /kanji-writing does not
  // trigger a dev re-optimization that breaks the in-flight chunk ("Đã có phiên bản mới").
  optimizeDeps: {
    include: ['hanzi-writer'],
  },
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
