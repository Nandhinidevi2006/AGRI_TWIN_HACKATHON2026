import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PC's local IP - update this if your IP changes
const BACKEND_IP = 'http://172.16.6.220:8000';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // For Android APK build - use absolute backend URL
  define: {
    '__BACKEND_URL__': JSON.stringify(
      command === 'build' ? BACKEND_IP : 'http://localhost:8000'
    )
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          icons: ['lucide-react']
        }
      }
    }
  }
}))
