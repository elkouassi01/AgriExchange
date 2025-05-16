import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',       // Pour accès réseau local
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      // Proxy API
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // ✅ Ne PAS supprimer le /api
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      },
      // Proxy images /uploads
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // ✅ Laisse le chemin intact
      }
    }
  }
});
