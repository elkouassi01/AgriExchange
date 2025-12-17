// src/services/axiosConfig.js
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL,           // <-- juste la variable du .env
  withCredentials: true,
  timeout: 10000,
});

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.params = { ...config.params, timestamp: Date.now() };
    return config;
  },
  error => Promise.reject(error)
);

export default api;

