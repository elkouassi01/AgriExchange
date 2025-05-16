import React, { useState, useEffect } from 'react';
import './ProductsPage.css';
import { useNavigate } from 'react-router-dom';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

// Composant Image sécurisé
const ProductImage = ({ src, alt, onClick }) => {
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);
     

  useEffect(() => {
    if (!src) {
      setImageSrc(DEFAULT_IMAGE);
      return;
    }

    // Définir l'URL de base du serveur pour les images
    const SERVER_BASE_URL = 'http://localhost:5000';
    
    let finalUrl;
    if (src.startsWith('http')) {
      finalUrl = src;
    } else if (src.startsWith('/uploads')) {
      finalUrl = `${SERVER_BASE_URL}${src}`;
    } else {
      finalUrl = `${SERVER_BASE_URL}/uploads/${src}`;
    }

    setImageSrc(finalUrl);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="product-image"
      onError={() => setImageSrc(DEFAULT_IMAGE)}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    />
  );
};

function ProductsPage() {
  const navigate = useNavigate();
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProduits = async () => {
    try {
      const res = await fetch('/api/v1/products');
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('📦 Produits reçus de l’API :', data);

      setProduits(
        data.map((p) => {
          const prixFormatte = `${Number(p.prix).toLocaleString('fr-FR')} FCFA / ${p.unite || 'kg'}`;
          const imageUrl = p.imageUrl || ''; // vide si rien

          return {
            ...p,
            prix: prixFormatte,
            imageUrl,
            categorie: p.categorie || 'Non classé',
          };
        })
      );
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Erreur API:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProduits();
  }, []);

  if (loading)
    return (
      <div className="products-container">
        <div className="loading">
          <div className="loading-spinner"></div>Chargement des produits...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="products-container">
        <div className="error">
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <button
            onClick={fetchProduits}
            className="product-button"
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Réessayer'}
          </button>
        </div>
      </div>
    );

  return (
    <div className="products-container">
      <div className="products-header">
        <h2>🌾 Tous nos produits</h2>
        <button
          onClick={fetchProduits}
          className="refresh-button"
          disabled={refreshing}
        >
          ⟳ Actualiser
        </button>
      </div>

      {produits.length === 0 ? (
        <div className="no-products">
          <p>Aucun produit disponible actuellement</p>
          <button onClick={fetchProduits} className="product-button">
            Actualiser
          </button>
        </div>
      ) : (
        <>
          <div className="products-grid">
            {produits.map((produit) => (
              <div key={produit._id} className="product-card">
                <div className="product-image-container">
                  <ProductImage
                    src={produit.imageUrl}
                    alt={produit.nom}
                    onClick={() => navigate(`/produits/${produit._id}`)}
                  />
                  <span className="product-category">
                    {produit.categorie}
                  </span>
                </div>
                <div className="product-info">
                  <h3>{produit.nom}</h3>
                  <p className="product-price">{produit.prix}</p>
                </div>
                <button
                  className="product-button"
                  onClick={() => navigate(`/produits/${produit._id}`)}
                >
                  Voir plus
                </button>
              </div>
            ))}
          </div>
          <div className="products-footer">
            <p>{produits.length} produits disponibles</p>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductsPage;
