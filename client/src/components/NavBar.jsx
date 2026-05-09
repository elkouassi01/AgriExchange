import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { Menu, X, HandCoins, Home, Leaf, User, LogIn, LogOut, Sprout, Search, MessageSquare } from 'lucide-react';
import api from '../services/axiosConfig';
import './NavBar.css';

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useUser();
  const { getSocket, unreadCount, setUnreadCount } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Charger le nombre de messages non lus au montage
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    api.get('/chat/unread/count')
      .then(res => setUnreadCount(res.data.count || 0))
      .catch(() => {});
  }, [user, setUnreadCount]);

  // Écouter les nouveaux messages pour incrémenter le badge
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNew = () => {
      // Ne pas incrémenter si l'utilisateur est déjà sur /messages (MessagesPage gère le décompte)
      if (location.pathname !== '/messages') {
        setUnreadCount(prev => prev + 1);
      }
    };
    socket.on('new_message', handleNew);
    return () => socket.off('new_message', handleNew);
  }, [getSocket, setUnreadCount, location.pathname]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    closeMenu();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/recherche?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
      closeMenu();
    }
  };

  // Déterminer le chemin du dashboard en fonction du rôle
  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'agriculteur') return '/profil-agriculteur';
    if (user?.role === 'consommateur') return '/profil-consommateur';
    return null;
  };

  const dashboardPath = getDashboardPath();

  // Calcul des initiales
  const fullName = `${user?.prenom || ''} ${user?.nom || ''}`.trim();
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <nav className="navbar">
      {/* Logo principal */}
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo-icon-wrapper">
          <Sprout size={30} className="navbar-logo-sprout" />
        </div>
        <span className="navbar-logo-text">
          <span className="logo-vivri">Vivri</span><span className="logo-market">Market</span>
        </span>
      </Link>

      {/* Bouton menu mobile */}
      <button className="menu-toggle" onClick={toggleMenu} aria-label="Menu">
        {menuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Liens de navigation */}
      <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>

        {/* Barre de recherche */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="navbar-search-input"
            aria-label="Rechercher"
          />
          <button type="submit" className="navbar-search-btn" aria-label="Lancer la recherche">
            <Search size={16} />
          </button>
        </form>

        <NavLink to="/" icon={<Home size={22} color='orange'/>} onClick={closeMenu}>
          Accueil
        </NavLink>

        <NavLink to="/produits" icon={<Leaf size={22} color='green' />} onClick={closeMenu}>
          Étals
        </NavLink>

        <NavLink to="/offres" icon={<HandCoins size={22} fill='gold' />} onClick={closeMenu}>
          Forfaits
        </NavLink>

        {/* Messages — visible uniquement si connecté */}
        {user && (
          <Link to="/messages" className="navbar-link navbar-messages-link" onClick={closeMenu}>
            <span className="navbar-messages-icon-wrap">
              <MessageSquare size={22} color="#16a34a" />
              {unreadCount > 0 && (
                <span className="navbar-msg-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </span>
            <span>Messages</span>
          </Link>
        )}

        {/* Lien vers tableau de bord si connecté */}
        {dashboardPath && (
          <NavLink to={dashboardPath} icon={!user?.photo ? <User size={22} color='black' /> : null} onClick={closeMenu}>
            {user?.photo ? (
              <img
                src={user.photo}
                alt={fullName || 'Profil'}
                className="navbar-avatar"
                title={fullName}
              />
            ) : initials ? (
              <span className="initials-circle" title={fullName}>
                {initials}
              </span>
            ) : (
              <span>Tableau de bord</span>
            )}
          </NavLink>
        )}

        {/* Connexion ou Déconnexion */}
        {!user ? (
          <NavLink to="/connexion" icon={<LogIn size={22} color='black' />} onClick={closeMenu}>
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