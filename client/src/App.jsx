// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import ProductsPage from './components/ProductsPage';
import ProductDetail from './components/ProductDetail';
import AddProductForm from './components/AddProductForm';
import FarmerDashboard from './components/FarmerDashboard';
import ConsumerDashboard from './components/ConsumerDashboard';
import CartPage from './components/CartPage';
import { useUser } from './contexts/UserContext';

function App() {
  const { user } = useUser();

  return (
    <Router>
      <NavBar />
      <Routes>
        {/* Accueil, Connexion, Produits disponibles */}
        <Route path="/" element={<HomePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/produits" element={<ProductsPage />} />
        <Route path="/produits/:id" element={<ProductDetail />} />

        {/* Panier accessible à tous */}
        <Route path="/panier" element={<CartPage />} />

        {/* Formulaire d’ajout accessible via le tableau de bord de l’agriculteur */}
        <Route path="/ajouter-produit" element={<AddProductForm />} />

        {/* Espace agriculteur */}
        {user?.role === 'agriculteur' && (
          <Route path="/profil-agriculteur" element={<FarmerDashboard />} />
        )}

        {/* Espace consommateur */}
        {user?.role === 'consommateur' && (
          <Route path="/profil-consommateur" element={<ConsumerDashboard />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
