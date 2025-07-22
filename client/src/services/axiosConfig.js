// src/services/axiosConfig.js
import axios from 'axios';

// Utilisation de import.meta.env pour Vite au lieu de process.env
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    
    // Si le token existe, l'ajouter aux headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ajouter un timestamp pour éviter les caches indésirables
    config.params = { ...config.params, timestamp: Date.now() };
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Intercepteur global pour les réponses
api.interceptors.response.use(
  response => {
    // Renouveler le token s'il est présent dans la réponse
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response;
  },
  error => {
    if (error.response) {
      // Gestion centralisée des erreurs
      switch (error.response.status) {
        case 401:
          console.warn('Session expirée - Déconnexion');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
          
        case 403:
          console.warn('Accès refusé - Permissions insuffisantes');
          break;
          
        case 429:
          console.warn('Trop de requêtes - Ralentissez');
          break;
          
        default:
          console.error(`Erreur serveur: ${error.response.status}`);
      }
      
      // Message d'erreur convivial
      if (error.response.data && error.response.data.message) {
        error.userMessage = error.response.data.message;
      } else {
        error.userMessage = "Une erreur inattendue s'est produite";
      }
    } 
    else if (error.request) {
      console.error('Erreur réseau - Serveur injoignable');
      error.userMessage = "Impossible de contacter le serveur. Vérifiez votre connexion Internet.";
    } 
    else {
      console.error('Erreur de configuration axios:', error.message);
      error.userMessage = "Erreur de configuration de la requête";
    }
    
    return Promise.reject(error);
  }
);

// Fonction utilitaire pour gérer les tokens
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuth = () => {
  localStorage.removeItem('token');
};

export default api;