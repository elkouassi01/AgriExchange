import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/axiosConfig'; // Axios déjà configuré

// 🧩 Création du contexte utilisateur
const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);

  // 🛡️ Intercepteur global pour gérer les erreurs 401 (session expirée)
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          clearSession();
          console.warn('⛔ Session expirée — déconnexion automatique.');
        }
        return Promise.reject(err);
      }
    );

    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // 🔐 Récupère l’utilisateur connecté via le token
  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const currentUser = res.data.utilisateur || res.data.user;

      if (currentUser && currentUser._id) {
        const abonnement = await fetchUserAbonnement(currentUser._id);
        const fullUser = {
          ...currentUser,
          abonnement: abonnement.formule ? abonnement : null,
          vuesDetails: abonnement.vuesDetails,
        };

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

  // 📦 Récupère les infos d’abonnement
  const fetchUserAbonnement = async (userId) => {
    try {
      const res = await api.get(`/users/${userId}/forfait`);
      return {
        formule: res.data.formule,
        statut: res.data.statut || 'inactif',
        dateFin: res.data.dateFin,
        vuesDetails: {
          quotaRestant: res.data.quotaRestant ?? 0,
          produitsVus: res.data.produitsVus ?? [],
        },
      };
    } catch (err) {
      console.error('❌ Erreur fetchUserAbonnement :', err.message);
      return {
        formule: null,
        statut: 'inactif',
        dateFin: null,
        vuesDetails: { quotaRestant: 0, produitsVus: [] },
      };
    }
  };

  // 🔄 Rafraîchit les données utilisateur + abonnement
  const refreshUserData = async () => {
    if (!user?._id) return;

    try {
      const [userRes, abonnementRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/users/${user._id}/forfait`),
      ]);

      const currentUser = userRes.data.utilisateur || userRes.data.user;
      const abonnement = {
        formule: abonnementRes.data.formule,
        statut: abonnementRes.data.statut || 'inactif',
        dateFin: abonnementRes.data.dateFin,
        vuesDetails: {
          quotaRestant: abonnementRes.data.quotaRestant ?? 0,
          produitsVus: abonnementRes.data.produitsVus ?? [],
        },
      };

      const fullUser = {
        ...currentUser,
        abonnement: abonnement.formule ? abonnement : null,
        vuesDetails: abonnement.vuesDetails,
      };

      setUser(fullUser);
      localStorage.setItem('userData', JSON.stringify(fullUser));
      return fullUser;
    } catch (err) {
      console.error('Erreur refreshUserData:', err);
      return user;
    }
  };

  // 🔑 Connexion — enregistre le token et l’utilisateur
  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('token', token);

    // 🔐 Injecte le token dans Axios pour toutes les requêtes suivantes
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  // 🚪 Déconnexion
  const logout = () => {
    clearSession();
  };

  // 🧹 Nettoyage de la session (sans route logout)
  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization']; // Important
  };

  // 🧭 Au chargement : restaure la session si token valide
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
        refreshUserData,
        api,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// 🪶 Hook personnalisé pour accéder au contexte
export const useUser = () => useContext(UserContext);
