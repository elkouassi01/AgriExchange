// src/services/axiosConfig.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1', // URL de base de ton API backend
  withCredentials: true,                   // Envoie les cookies (JWT en cookie) avec chaque requête
  timeout: 10000,                          // Timeout de 10 secondes pour éviter requêtes bloquées indéfiniment
});

// Intercepteur global pour les réponses
api.interceptors.response.use(
  response => response,  // En cas de succès, renvoyer la réponse directement
  error => {
    if (error.response) {
      // Gérer les erreurs HTTP globales ici
      if (error.response.status === 401) {
        // Par exemple, token expiré ou non autorisé
        console.warn('Non autorisé, token peut être expiré');
        // Ici tu peux déclencher une déconnexion automatique ou redirection vers login
        // ex: window.location.href = '/login';
      }
      // Tu peux gérer d’autres statuts HTTP spécifiques (403, 500...) ici
    } else if (error.request) {
      // Pas de réponse reçue du serveur (timeout, réseau down...)
      console.error('Erreur réseau ou serveur non joignable');
    } else {
      // Erreur lors de la configuration de la requête
      console.error('Erreur lors de la requête axios:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
