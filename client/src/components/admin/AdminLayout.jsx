// src/components/admin/AdminLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useUser } from '../../contexts/UserContext';
import './AdminLayout.css'; 

const AdminLayout = () => {
  const { user: admin, logout } = useUser();

  return (
    <div className="admin-layout">
      <AdminSidebar />
      
      <div className="admin-content">
        <AdminHeader admin={admin} onLogout={logout} />
        
        <main className="admin-main">
          <div className="content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;