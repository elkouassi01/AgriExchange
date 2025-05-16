import React from "react";
import { Link } from "react-router-dom";
import "./ConsumerDashboard.css";

// Icônes Lucide
import { ShoppingCart, Heart, User, ScrollText } from "lucide-react";

const ConsumerDashboard = () => {
  return (
    <div className="dashboard-container">
      <h1>Espace Consommateur</h1>
      <div className="dashboard-actions">
        <Link to="/produits" className="dashboard-link">
          <ShoppingCart size={24} />
          Parcourir les produits
        </Link>
        <Link to="/favoris" className="dashboard-link">
          <Heart size={24} />
          Voir mes favoris
        </Link>
        <Link to="/profil-consommateur" className="dashboard-link">
          <User size={24} />
          Mon profil
        </Link>
        <Link to="/historique-commande" className="dashboard-link">
          <ScrollText size={24} color="#2e7d32"/>
          Historique Achats
        </Link>
      </div>
    </div>
  );
};

export default ConsumerDashboard;
