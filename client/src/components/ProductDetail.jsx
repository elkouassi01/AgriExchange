import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './ProductDetail.css';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const formatFCFA = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount) + ' FCFA';
};

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  const SERVER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchProduit = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          setError("ID de produit invalide");
          setErrorDetails({ received: id });
          setLoading(false);
          return;
        }

        const headers = user?.token
          ? {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            }
          : {};

        const res = await fetch(`${SERVER_BASE_URL}/api/v1/products/${id}`, { headers });

        if (!res.ok) {
          let message = `Erreur ${res.status}`;
          try {
            const json = await res.json();
            if (json.message) message += ` : ${json.message}`;
            setError(message);
            setErrorDetails(json);
          } catch {
            const text = await res.text();
            message += text ? ` : ${text}` : '';
            setError(message);
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        const product = data.product || data;

        if (!product || !product._id) {
          setError("Produit introuvable");
          setErrorDetails({ response: data });
          setLoading(false);
          return;
        }

        let imageUrl = product.imageUrl || DEFAULT_IMAGE;
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:')) {
          if (imageUrl.startsWith('/uploads/')) {
            imageUrl = `${SERVER_BASE_URL}${imageUrl}`;
          } else if (!imageUrl.startsWith('/')) {
            imageUrl = `${SERVER_BASE_URL}/uploads/${imageUrl}`;
          } else {
            imageUrl = `${SERVER_BASE_URL}${imageUrl}`;
          }
        }

        const prixFormatte = `${formatFCFA(product.prix)} / ${product.unite || 'kg'}`;

        setProduit({
          ...product,
          prix: prixFormatte,
          imageUrl,
          categorie: product.categorie || 'Non classé',
          vendeur: product.sellerId || product.vendeur,
        });
      } catch (err) {
        if (err.message.includes("Failed to fetch")) {
          setError("Erreur réseau: Impossible de contacter le serveur");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduit();
  }, [id, user, SERVER_BASE_URL]);

  const retryLoading = () => {
    setError(null);
    setErrorDetails(null);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des détails du produit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Erreur de chargement</h3>
        <p className="error-message">{error}</p>
        {errorDetails && (
          <div className="error-details">
            {errorDetails.message && <p>{errorDetails.message}</p>}
            {errorDetails.received && <p><strong>ID reçu :</strong> {errorDetails.received}</p>}
          </div>
        )}
        <div className="error-actions">
          <button onClick={retryLoading}>Réessayer</button>
          <button onClick={() => navigate('/categories')}>Retour aux catégories</button>
          <button onClick={() => navigate('/')}>Accueil</button>
        </div>
      </div>
    );
  }

  if (!produit) {
    return (
      <div className="not-found-container">
        <h3>Produit introuvable</h3>
        <p>Le produit demandé n'existe pas ou a été supprimé.</p>
        <button onClick={() => navigate('/categories')}>Voir tous les produits</button>
        <button onClick={() => navigate(-1)}>Retour</button>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <div className="product-detail-card">
        <div className="product-image">
          <img
            src={produit.imageUrl}
            alt={produit.nom}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_IMAGE;
              e.target.classList.add("default-image");
            }}
          />
        </div>

        <div className="product-info">
          <h1>{produit.nom}</h1>

          <div className="info-line">
            <strong>Catégorie :</strong>&nbsp;{produit.categorie}
          </div>
          <div className="info-line">
            <strong>Prix :</strong>&nbsp;{produit.prix}
          </div>

          {produit.dateRecolte && (
            <div className="info-line">
              <strong>Date de récolte :</strong>&nbsp;
              {new Date(produit.dateRecolte).toLocaleDateString('fr-FR')}
            </div>
          )}

          <div className="product-description">
            <h3>Description</h3>
            <p>{produit.description || 'Aucune description fournie.'}</p>
          </div>

          {produit.tags && produit.tags.length > 0 && (
            <div className="product-description">
              <h3>Tags</h3>
              <div className="tags-container">
                {produit.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {produit.vendeur && (
            <div className="seller-contact">
              <h3>Contact du vendeur</h3>
              <p><strong>Nom :</strong> {produit.vendeur.nom}</p>
              {produit.vendeur.contact && <p><strong>Téléphone :</strong> {produit.vendeur.contact}</p>}
              {produit.vendeur.email && <p><strong>Email :</strong> {produit.vendeur.email}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="navigation-buttons">
        <button onClick={() => navigate(-1)} className="back-button">← Retour aux produits</button>
        <button onClick={() => window.scrollTo(0, 0)} className="top-button">↑ Haut de page</button>
      </div>
    </div>
  );
}

export default ProductDetail;
