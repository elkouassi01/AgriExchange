// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM helper
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  // Build optimisé pour la prod
  build: {
    chunkSizeWarningLimit: 1000, // kB (≈ 1 Mo) – suffisant
    outDir: 'dist',
    sourcemap: true,             // utile en prod pour le debug
  },

  // Tests (Vitest) – uniquement local
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    exclude: ['**/node_modules/**', '**/dist/**'],
  },

  // ────────────────────────────────────────────────────────────────
  //  TOUT CE QUI SUIT NE SERT QU’EN DÉVELOPPEMENT
  //  Le bloc « server » est ignoré dès que vous faites « npm run build »
  // ────────────────────────────────────────────────────────────────
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: ['.ngrok-free.app'],

    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
      },
    },

    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, 'node_modules'),
      ],
    },
  },
});