import React from 'react';
import AddProductForm from '../components/AddProductForm';

const AgriculteurDashboard = () => {
  return (
    <div className="dashboard-container">
      <h1>Bienvenue sur votre espace agriculteur</h1>
      <h2>Ajouter un produit</h2>
      <AddProductForm />
    </div>
  );
};

export default AgriculteurDashboard;
