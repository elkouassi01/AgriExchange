import React, { useEffect, useState } from 'react';
import AddProductForm from '../components/AddProductForm';
import { useUser } from '../contexts/UserContext';
import './FarmerDashboard.css';

const SERVER_BASE_URL = 'http://localhost:5000';

const FarmerDashboard = () => {
  const { user, secureFetch } = useUser();
  const [mesProduits, setMesProduits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesProduits = async () => {
      try {
        const res = await secureFetch(`/api/v1/products/by-farmer/${user._id}`);
        const data = await res.json();
        setMesProduits(data);
      } catch (err) {
        console.error("Erreur lors du chargement des produits de l'agriculteur :", err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) {
      fetchMesProduits();
    }
  }, [user]);

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">👨‍🌾 Bienvenue sur votre espace agriculteur</h1>

      <section className="add-product-section">
        <h2>➕ Ajouter un nouveau produit</h2>
        <AddProductForm />
      </section>

      <section className="products-section">
        <h2>📦 Mes produits postés</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : mesProduits.length === 0 ? (
          <p>Vous n'avez encore posté aucun produit.</p>
        ) : (
          <div className="products-grid">
            {mesProduits.map((produit) => (
              <div key={produit._id} className="product-card">
                <img
                  src={
                    produit.imageUrl?.startsWith('http')
                      ? produit.imageUrl
                      : `${SERVER_BASE_URL}/uploads/${produit.imageUrl}`
                  }
                  alt={produit.nom}
                  className="product-image"
                />
                <div className="product-info">
                  <h3>{produit.nom}</h3>
                  <p><strong>Prix :</strong> {Number(produit.prix).toLocaleString()} FCFA / {produit.unite || 'kg'}</p>
                  <p><strong>Quantité :</strong> {produit.quantite}</p>
                  <p><strong>Récolté le :</strong> {new Date(produit.dateRecolte).toLocaleDateString('fr-FR')}</p>
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
