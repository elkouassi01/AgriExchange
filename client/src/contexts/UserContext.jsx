import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Création du contexte utilisateur
const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  // État utilisateur initialisé à partir du localStorage
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  // Instance Axios préconfigurée pour toutes les requêtes
  const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    withCredentials: true, // Active l'envoi des cookies
  });

  // Intercepteur pour gérer les erreurs globalement
  api.interceptors.response.use(
    response => response,
    error => {
      // Gestion spécifique des erreurs 401 (Non autorisé)
      if (error.response?.status === 401) {
        clearSession();
        console.warn('Session expirée - Déconnexion');
      }
      return Promise.reject(error);
    }
  );

  /**
   * 🔐 Récupère les informations de l'utilisateur connecté
   * - Vérifie la session côté serveur
   * - Met à jour les données locales
   */
  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const currentUser = res.data.utilisateur;

      if (currentUser) {
        // Récupération des données d'abonnement
        const abonnement = await fetchUserAbonnement(currentUser._id);
        const userWithAbonnement = { ...currentUser, ...abonnement };

        // Mise à jour de l'état et du stockage local
        setUser(userWithAbonnement);
        localStorage.setItem('userData', JSON.stringify(userWithAbonnement));
      } else {
        clearSession();
      }
    } catch (err) {
      console.warn('Erreur fetchUser :', err.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📦 Récupère les informations d'abonnement de l'utilisateur
   * @param {string} userId - ID de l'utilisateur
   */
  const fetchUserAbonnement = async (userId) => {
    try {
      const res = await api.get(`/users/${userId}/forfait`);
      const { formule, actif, quotaRestant, produitsVus } = res.data;

      return {
        formule,
        abonnementActif: actif,
        vuesDetails: {
          quotaRestant: quotaRestant ?? 0,
          produitsVus: produitsVus ?? [],
        },
      };
    } catch (err) {
      console.error('Erreur fetchUserAbonnement :', err.message);
      return {
        formule: null,
        abonnementActif: false,
        vuesDetails: { quotaRestant: 0, produitsVus: [] },
      };
    }
  };

  /**
   * 🔑 Connecte l'utilisateur et met à jour les données
   * @param {Object} userData - Données utilisateur
   */
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  /**
   * 🚪 Déconnecte l'utilisateur et nettoie le stockage
   */
  const logout = () => {
    clearSession();
  };

  /**
   * 🧹 Nettoie la session utilisateur
   */
  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('userData');
    // Optionnel : Appeler une API de déconnexion côté serveur
    // api.post('/auth/logout');
  };

  /**
   * 🔄 Rafraîchit les données d'abonnement
   */
  const refreshUserAbonnement = async () => {
    if (!user?._id) return;
    
    try {
      const abonnement = await fetchUserAbonnement(user._id);
      const updatedUser = { ...user, ...abonnement };
      
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Erreur refreshUserAbonnement:', error);
    }
  };

  // Au montage du composant : vérifie la session utilisateur
  useEffect(() => {
    // Ne tente de récupérer l'utilisateur que si un token existe
    const tokenExists = document.cookie.includes('token') || localStorage.getItem('userData');
    if (tokenExists) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        fetchUser,
        refreshUserAbonnement,
        api // Expose l'instance axios configurée
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Hook personnalisé pour accéder au contexte
export const useUser = () => useContext(UserContext);