import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminAuthContext = createContext({
  admin: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('adminData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAdmin(parsed);
      }
    } catch (error) {
      console.error('Données admin corrompues:', error);
      handleLogout(false); // ne pas naviguer dans ce contexte
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (adminData) => {
    setAdmin(adminData);
    localStorage.setItem('adminData', JSON.stringify(adminData));
  };

  const handleLogout = (redirect = true) => {
    setAdmin(null);
    localStorage.removeItem('adminData');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (redirect) {
      navigate('/');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        login,
        logout: handleLogout,
        loading,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
