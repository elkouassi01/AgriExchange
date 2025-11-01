// src/components/admin/AdminHeader.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext'; // adapte le chemin selon ton arborescence
import './AdminHeader.css';

const AdminHeader = () => {
  const { admin, logout } = useAdminAuth();

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        <Link to="/admin" className="admin-header-title">
          Home
        </Link>

        <div className="admin-header-right">
          <div className="admin-header-user">
            <p className="admin-user-name">{admin?.nom || 'Admin'}</p>
            <p className="admin-user-email">{admin?.email || ''}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="admin-logout-btn"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
