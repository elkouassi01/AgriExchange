// Import des fonctions nécessaires depuis Vite et Node.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Pour gérer les chemins de fichiers

// Export de la configuration Vite
export default defineConfig({

  // Plugins utilisés, ici React via le plugin officiel
  plugins: [react()],

  // Configuration pour les tests unitaires avec Vitest
  test: {
    globals: true,               // Active les fonctions globales (describe, it, expect) sans import
    environment: 'jsdom',       // Simule un DOM pour tester les composants React côté serveur
    setupFiles: './tests/setup.js', // Script de setup avant les tests (ex: mocks globaux)
    coverage: {                 // Configuration du rapport de couverture de tests
      provider: 'v8',           // Utilise le moteur V8 pour mesurer la couverture
      reporter: ['text', 'json', 'html'] // Types de rapports générés
    },
    exclude: ['**/node_modules/**', '**/dist/**'] // Exclut ces dossiers des tests
  },

  // Configuration du serveur de développement local
  server: {
    host: '0.0.0.0',            // Rend le serveur accessible sur le réseau local
    port: 5173,                 // Port par défaut de Vite
    strictPort: true,           // Si le port 5173 est pris, Vite échoue (ne change pas de port)
    cors: true,                 // Active CORS par défaut (utile pour les appels API)

    // Permet d’autoriser les accès venant de domaines ngrok (pratique pour le dev distant)
    allowedHosts: ['.ngrok-free.app'],

    // Configuration du proxy pour rediriger certaines requêtes vers le backend Node.js
    proxy: {
      // Proxy pour toutes les requêtes commençant par /api vers le backend localhost:5000
      '/api': {
        target: 'http://localhost:5000', // Backend Node.js
        changeOrigin: true,               // Change l’origine de la requête vers la cible
        secure: false,                    // Désactive la vérification HTTPS (utile en dev)
        rewrite: (path) => path,          // Pas de réécriture, on garde le chemin tel quel
        headers: {
          'ngrok-skip-browser-warning': 'true' // En-tête spécifique pour ngrok
        }
      },

      // Proxy pour accéder aux fichiers uploadés (images, etc.) du backend
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    },

    // **Important** : autoriser l’accès aux fichiers situés en dehors du dossier racine Vite
    fs: {
      allow: [
        path.resolve(__dirname),           // Autorise le dossier racine où est vite.config.js (ex: client/)
        path.resolve(__dirname, 'node_modules') // Autorise node_modules (pour importer CSS etc.)
      ]
    }
  }
});
