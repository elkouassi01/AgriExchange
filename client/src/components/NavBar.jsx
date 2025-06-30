import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import {
  Menu, X, HandCoins, Home, Leaf, User, LogIn, LogOut
} from 'lucide-react';
import './NavBar.css';

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useUser();
  const { admin } = useAdminAuth();
  const navigate = useNavigate();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    closeMenu();
  };

  const dashboardPath =
    admin ? '/admin/dashboard' :
    user?.role === 'agriculteur' ? '/profil-agriculteur' :
    user?.role === 'consommateur' ? '/profil-consommateur' :
    null;

  // 🔤 Calcul des initiales à partir du nom complet
  const fullName = admin?.nom || `${user?.prenom || ''} ${user?.nom || ''}`.trim();
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2); // Max 2 lettres

  return (
    <nav className="navbar">
      {/* Logo principal */}
      <div className="navbar-brand">
        <Leaf className="navbar-logo-icon" size={24} />
        <span className="navbar-logo-text">AgriExch</span>
      </div>

      {/* Bouton menu mobile */}
      <button className="menu-toggle" onClick={toggleMenu} aria-label="Menu">
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Liens de navigation */}
      <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
        <NavLink to="/" icon={<Home size={18} />} onClick={closeMenu}>
          Accueil
        </NavLink>

        <NavLink to="/produits" icon={<Leaf size={18} />} onClick={closeMenu}>
          Produits
        </NavLink>

        <NavLink to="/offres" icon={<HandCoins size={18} />} onClick={closeMenu}>
          Offres
        </NavLink>

        {/* Lien vers tableau de bord si connecté */}
        {dashboardPath && (
          <NavLink to={dashboardPath} icon={<User size={18} />} onClick={closeMenu}>
            
            {initials && (
              <span className="initials-circle" title={fullName}>
                {initials}
              </span>
            )}
          </NavLink>
        )}

        {/* Connexion ou Déconnexion */}
        {!user && !admin ? (
          <NavLink to="/connexion" icon={<LogIn size={18} />} onClick={closeMenu}>
            Connexion
          </NavLink>
        ) : (
          <button className="navbar-link logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        )}
      </div>
    </nav>
  );
}

// Composant réutilisable pour les liens
const NavLink = ({ to, icon, children, onClick }) => (
  <Link to={to} className="navbar-link" onClick={onClick}>
    {icon}
    <span>{children}</span>
  </Link>
);

export default NavBar;
