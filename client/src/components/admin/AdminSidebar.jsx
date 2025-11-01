// src/components/admin/AdminSidebar.jsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { 
  HiChartPie, 
  HiUserGroup, 
  HiCurrencyDollar, 
  HiCreditCard, 
  HiCog, 
  HiLogout,
  HiChevronLeft,
  HiChevronRight
} from 'react-icons/hi';
import './AdminSidebar.css'; 

const AdminSidebar = () => {
  const { logout } = useAdminAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { path: '/admin', label: 'Tableau de bord', icon: <HiChartPie /> },
    { path: '/admin/users', label: 'Utilisateurs', icon: <HiUserGroup /> },
    { path: '/admin/transactions', label: 'Transactions', icon: <HiCurrencyDollar /> },
    { path: '/admin/subscriptions', label: 'Abonnements', icon: <HiCreditCard /> },
    { path: '/admin/settings', label: 'Paramètres', icon: <HiCog /> },
  ];

  return (
    <div className="admin-sidebar-container">
      <button 
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside 
        className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        aria-label="Navigation principale"
      >
        <div className="admin-sidebar-header">
          <div className="brand-icon">
            <HiChartPie className="w-6 h-6" />
          </div>
          {!isCollapsed && <h1 className="brand-text"> Admin</h1>}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-button"
            aria-label={isCollapsed ? "Développer" : "Replier"}
          >
            {isCollapsed ? <HiChevronRight /> : <HiChevronLeft />}
          </button>
        </div>

        <nav className="admin-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                  {/* Ajout du tooltip pour l'état replié */}
                  {isCollapsed && (
                    <span className="tooltip">{item.label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto">
          <button
            onClick={logout}
            className={`logout-button ${isCollapsed ? 'collapsed' : ''}`}
            aria-label="Déconnexion"
          >
            <HiLogout className="w-5 h-5" />
            {!isCollapsed && <span>Déconnexion</span>}
            {/* Ajout du tooltip pour le bouton de déconnexion en état replié */}
            {isCollapsed && (
              <span className="tooltip">Déconnexion</span>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default AdminSidebar;