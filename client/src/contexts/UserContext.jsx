import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import api from '../services/axiosConfig';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('userData');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token');
  });

  const [loading, setLoading] = useState(true);

  // Ref pour que l'intercepteur accède toujours à l'état user courant
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Nettoyage local (défini tôt pour l'intercepteur)
  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
  }, []);

  // Intercepteur global : réagit aux 401 uniquement si une session était active
  // (évite de polluer la console lors du check initial /auth/me sans session)
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      res => res,
      err => {
        const isAuthMe = err.config?.url?.includes('/auth/me');
        if (err.response?.status === 401 && !isAuthMe && userRef.current) {
          clearSession();
        }
        return Promise.reject(err);
      }
    );
    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [clearSession]);

  // Recupere l'utilisateur connecte via le cookie httpOnly
  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const currentUser = res.data.utilisateur || res.data.user;
      const userId = currentUser?.id || currentUser?._id;

      if (currentUser && userId) {
        setUser(currentUser);
        localStorage.setItem('userData', JSON.stringify(currentUser));
      } else {
        clearSession();
      }
    } catch (err) {
      // 401 = pas de session active, comportement normal au démarrage
      if (err.response?.status !== 401) {
        console.warn('Erreur fetchUser :', err.message);
      }
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  // Rafraichit les donnees utilisateur
  const refreshUserData = async () => {
    const uid = user?.id || user?._id;
    if (!uid) return;

    try {
      const userRes = await api.get('/auth/me');
      const currentUser = userRes.data.utilisateur || userRes.data.user;

      setUser(currentUser);
      localStorage.setItem('userData', JSON.stringify(currentUser));
      return currentUser;
    } catch (err) {
      console.error('Erreur refreshUserData:', err);
      return user;
    }
  };

  // Connexion — stocke le token JWT en plus du profil
  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    if (jwtToken) {
      localStorage.setItem('token', jwtToken);
    }
  };

  // Deconnexion — efface le cookie cote serveur puis nettoie localement
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // cookie peut deja etre absent, on continue
    }
    clearSession();
  };


  // Au chargement : restaure la session seulement si un token existe localement
  // Le ref évite la double-invocation de React StrictMode en développement
  const fetchCalledRef = useRef(false);
  useEffect(() => {
    if (fetchCalledRef.current) return;
    fetchCalledRef.current = true;

    const hasSession = localStorage.getItem('token') || localStorage.getItem('userData');
    if (hasSession) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        token,
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

export const useUser = () => useContext(UserContext);
