import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Contexte utilisateur
const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  // Instance Axios configurée
  const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    withCredentials: true,
  });

  // Intercepteur de réponse
  api.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401) {
        clearSession();
        console.warn('⛔ Session expirée');
      }
      return Promise.reject(err);
    }
  );

  /**
   * 🔐 Récupère l'utilisateur connecté et son abonnement
   */
  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const currentUser = res.data.utilisateur;

      if (currentUser && currentUser._id) {
        const abonnement = await fetchUserAbonnement(currentUser._id);
        const fullUser = { ...currentUser, ...abonnement };

        setUser(fullUser);
        localStorage.setItem('userData', JSON.stringify(fullUser));
      } else {
        clearSession();
      }
    } catch (err) {
      console.warn('⚠️ Erreur fetchUser :', err.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📦 Récupère l'abonnement de l'utilisateur
   */
  const fetchUserAbonnement = async (userId) => {
    if (!userId || typeof userId !== 'string') {
      console.warn('❌ ID utilisateur manquant pour abonnement');
      return {
        formule: null,
        abonnementActif: false,
        vuesDetails: { quotaRestant: 0, produitsVus: [] },
      };
    }

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
      console.error('❌ Erreur fetchUserAbonnement :', err.message);
      return {
        formule: null,
        abonnementActif: false,
        vuesDetails: { quotaRestant: 0, produitsVus: [] },
      };
    }
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const logout = () => {
    clearSession();
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('userData');
    // Optionnel : api.post('/auth/logout');
  };

  const refreshUserAbonnement = async () => {
    if (!user || !user._id) return;

    try {
      const abonnement = await fetchUserAbonnement(user._id);
      const updatedUser = { ...user, ...abonnement };
      setUser(updatedUser);
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Erreur refreshUserAbonnement:', err);
    }
  };

  // Lors du montage : récupérer l'utilisateur si cookie/token présent
  useEffect(() => {
    const hasToken = document.cookie.includes('token') || localStorage.getItem('userData');
    if (hasToken) {
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
        api,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Hook personnalisé
export const useUser = () => useContext(UserContext);
