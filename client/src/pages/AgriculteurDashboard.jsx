import React, { useEffect, useState } from 'react';
import AddProductForm from '../components/AddProductForm';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import './FarmerDashboard.css';

const FarmerDashboard = () => {
  const { user } = useUser();
  const [mesProduits, setMesProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesProduits = async () => {
      try {
        const res = await api.get('/products/my-products');
        const products = res.data?.data?.products || res.data?.products || res.data || [];
        setMesProduits(Array.isArray(products) ? products : []);
      } catch (err) {
        console.error("Erreur lors du chargement des produits de l'agriculteur :", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchMesProduits();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Bienvenue sur votre espace agriculteur</h1>

      <section className="add-product-section">
        <h2>Ajouter un nouveau produit</h2>
        <AddProductForm />
      </section>

      <section className="products-section">
        <h2>Mes produits postes</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : mesProduits.length === 0 ? (
          <p>Vous n'avez encore poste aucun produit.</p>
        ) : (
          <div className="products-grid">
            {mesProduits.map((produit) => (
              <div key={produit._id} className="product-card">
                <img
                  src={buildUploadUrl(produit.imageUrl)}
                  alt={produit.nom}
                  className="product-image"
                />
                <div className="product-info">
                  <h3>{produit.nom}</h3>
                  <p><strong>Prix :</strong> {Number(produit.prix).toLocaleString()} FCFA / {produit.unite || 'kg'}</p>
                  <p><strong>Quantite :</strong> {produit.quantite || produit.stock || 0}</p>
                  <p><strong>Recolte le :</strong> {new Date(produit.dateRecolte).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FarmerDashboard;
