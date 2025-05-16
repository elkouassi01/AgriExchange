import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ProductDetail.css';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(10);
  

  useEffect(() => {
    const fetchProduit = async () => {
      try {
        const res = await fetch(`/api/v1/products/${id}`);
        if (!res.ok) throw new Error(`Erreur ${res.status} : ${res.statusText}`);
        const data = await res.json();

        const prixFormatte = `${Number(data.prix).toLocaleString('fr-FR')} FCFA / ${data.unite || 'kg'}`;

        let imageUrl = data.imageUrl || '';
        const SERVER_BASE_URL = 'http://localhost:5000';
        if (!imageUrl || imageUrl === '') {
          imageUrl = DEFAULT_IMAGE;
        } else if (!imageUrl.startsWith('http')) {
          imageUrl = imageUrl.startsWith('/uploads')
            ? `${SERVER_BASE_URL}${imageUrl}`
            : `${SERVER_BASE_URL}/uploads/${imageUrl}`;
        }

        setProduit({
          ...data,
          prix: prixFormatte,
          imageUrl,
          categorie: data.categorie || 'Non classé',
        });
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement du produit :', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduit();
  }, [id]);

  const handleQuantityChange = (value) => {
    const step = 10;
    const newValue = Math.max(10, Math.min(10000000, quantity + value * step));
    setQuantity(newValue);
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement du produit...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-icon">!</div>
      <p className="error-message">Erreur : {error}</p>
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Retour aux produits
      </button>
    </div>
  );

  if (!produit) return (
    <div className="not-found-container">
      <p>Produit introuvable</p>
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Retour aux produits
      </button>
    </div>
  );

  return (
    <div className="product-detail-container">
      <div className="product-detail-content">
        <div className="product-image-section">
          <img
            src={produit.imageUrl}
            alt={produit.nom}
            className="product-detail-image"
            onError={(e) => (e.target.src = DEFAULT_IMAGE)}
          />
        </div>

        <div className="product-info-section">
          <div className="product-header">
            <span className="product-category-badge">{produit.categorie}</span>
            <h1 className="product-title">{produit.nom}</h1>
            <div className="product-price">{produit.prix}</div>
          </div>

          <div className="product-description">
            <h3>Description</h3>
            <p>{produit.description || 'Aucune description fournie.'}</p>
          </div>

          {produit.caracteristiques && (
            <div className="product-features">
              <h3>Caractéristiques</h3>
              <ul>
                {Object.entries(produit.caracteristiques).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="product-actions">
            <div className="quantity-selector">
              <button 
                className="quantity-btn" 
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                type="number"
                className="quantity-input"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 10 && val <= 10000000) {
                    setQuantity(val);
                  }
                }}
                step={10}
                min={10}
                max={10000000}
              />

              <button 
                className="quantity-btn" 
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 10000000}
              >
                +
              </button>
            </div>

            <button className="add-to-cart-btn">
              Ajouter au panier ({quantity * Number(produit.prix.split(' ')[0].replace(/\s/g, ''))} FCFA)
            </button>
          </div>

          <button className="back-button" onClick={() => navigate(-1)}>
            ← Retour aux produits
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;