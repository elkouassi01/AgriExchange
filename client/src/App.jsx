// src/App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom';

// 🌐 Pages principales
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import ProductsPage from './components/ProductsPage';
import ProductDetail from './components/ProductDetail';
import CategoriePage from './components/CategoriePage';
import OffersPage from './components/OffersPage';
import InscriptionPage from './components/InscriptionPage';
import PaiementPage from './components/PaiementPage';
import PaiementReussi from './components/PaiementReussi';
import PaiementEchec from './components/PaiementEchec';
import TermsPage from './components/TermsPage';
import ApproposPage from './components/Apropo';
import NoservicePage from './components/Noservices';

// 👨‍🌾 Agriculteur
import AddProductForm from './components/AddProductForm';
import FarmerDashboard from './components/FarmerDashboard';
import MesProduits from './components/MesProduits';
import GestionAbonnes from './components/GestionAbonnes';
import ProfilUtilisateur from './components/ProfilUtilisateur';

// 👤 Consommateur
import ConsumerDashboard from './components/ConsumerDashboard';

// ⚙️ Admin
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import TransactionsPage from './pages/admin/TransactionsPage';
import SubscriptionsPage from './pages/admin/SubscriptionsPage';
import SettingsPage from './pages/admin/SettingsPage';

// 🧠 Contextes
import { UserProvider, useUser } from './contexts/UserContext';

// 🔐 Composant pour protéger les routes par rôle
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
        <p className="ml-4 text-gray-600">Chargement...</p>
      </div>
    );
  }

  // Si non connecté => redirection vers page connexion
  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // Si rôle requis et non autorisé => redirection page d'accueil
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

// 🌍 Contenu principal de l'application
const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Affiche NavBar uniquement pour les routes hors /admin */}
      {!isAdminRoute && <NavBar />}

      <Routes>
        {/* 🌐 Routes publiques */}
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/produits" element={<ProductsPage />} />
        <Route path="/produits/:id" element={<ProductDetail />} />
        <Route path="/categories/:nomCategorie" element={<CategoriePage />} />
        <Route path="/inscription" element={<InscriptionPage />} />
        <Route path="/paiement" element={<PaiementPage />} />
        <Route path="/paiement-reussi" element={<PaiementReussi />} />
        <Route path="/paiement-echec" element={<PaiementEchec />} />
        <Route path="/offres" element={<OffersPage />} />
        <Route path="/condition" element={<TermsPage />} />
        <Route path="/Appropos" element={<ApproposPage />} />
        <Route path="/Noservice" element={<NoservicePage />} />
        <Route path="/mes-produits" element={<MesProduits />} />
        <Route path="/abonne" element={<GestionAbonnes />} />
        <Route path="/profil" element={<ProfilUtilisateur />} />

        {/* 👨‍🌾 Routes agriculteur protégées */}
        <Route
          path="/ajouter-produit"
          element={
            <ProtectedRoute roles={['agriculteur']}>
              <AddProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil-agriculteur"
          element={
            <ProtectedRoute roles={['agriculteur']}>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />

        {/* 👤 Routes consommateur protégées */}
        <Route
          path="/profil-consommateur"
          element={
            <ProtectedRoute roles={['consommateur']}>
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ⚙️ Routes Admin */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Redirection pour les URLs admin directes */}
        <Route 
          path="/admin/dashboard" 
          element={<Navigate to="/admin/dashboard" replace />} 
        />

        {/* 🌪 Route inconnue => redirection vers l'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

// 📦 App principale avec structure : Router > Contextes > Contenu
function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}

export default App;