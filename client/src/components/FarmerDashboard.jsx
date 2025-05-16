import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "./FarmerDashboard.css";

const DASHBOARD_ACTIONS = [
  { path: "/ajouter-produit", icon: "➕", text: "Ajouter un produit" },
  { path: "/mes-produits", icon: "📦", text: "Voir mes produits" },
  { path: "/commandes", icon: "🧾", text: "Gérer les commandes" },
  { path: "/profil", icon: "👤", text: "Mon profil" },
];

const FarmerDashboard = () => {
  const actionLinks = useMemo(() => (
    DASHBOARD_ACTIONS.map(({ path, icon, text }) => (
      <Link 
        key={path} 
        to={path} 
        className="dashboard-link"
        aria-label={text}
      >
        {icon} {text}
      </Link>
    ))
  ), []);

  return (
    <div className="dashboard-container" role="main">
      <h1>Espace Agriculteur</h1>
      <nav className="dashboard-actions" aria-label="Navigation principale">
        {actionLinks}
      </nav>
    </div>
  );
};

export default React.memo(FarmerDashboard);