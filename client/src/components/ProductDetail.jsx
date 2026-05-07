import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './ProductDetail.css';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const ACCESS_KEY = (productId) => `pv_tx_${productId}`;

const formatFCFA = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' FCFA';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [seller, setSeller] = useState(null);
  const [accessState, setAccessState] = useState('idle'); // idle | checking | granted | denied
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const checkAccess = useCallback(async (txId) => {
    setAccessState('checking');
    try {
      const res = await api.get(`/product-payments/${id}/check?tx_id=${txId}`);
      if (res.data.paid) {
        setSeller(res.data.seller);
        setAccessState('granted');
        localStorage.setItem(ACCESS_KEY(id), txId);
      } else {
        setAccessState('denied');
        localStorage.removeItem(ACCESS_KEY(id));
      }
    } catch {
      setAccessState('denied');
    }
  }, [id]);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/products/${id}`);
        const product = res.data.data?.product || res.data.product || res.data;

        if (!product) {
          setError('Produit introuvable');
          return;
        }

        const imageUrl = buildUploadUrl(product.imageUrl || '') || DEFAULT_IMAGE;
        const prixFormatte = `${formatFCFA(product.prix)} / ${product.unite || 'kg'}`;

        setProduit({ ...product, prixFormatte, imageUrl });
      } catch (err) {
        if (err.response?.status === 404) setError('Produit introuvable');
        else if (err.request) setError('Serveur injoignable. Vérifiez votre connexion.');
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    // Check if returning from CinetPay with tx_id in URL
    const txId = searchParams.get('tx_id');
    if (txId) {
      setSearchParams({}, { replace: true });
      checkAccess(txId);
    } else {
      const saved = localStorage.getItem(ACCESS_KEY(id));
      if (saved) {
        checkAccess(saved);
      } else {
        setAccessState('denied');
      }
    }
  }, [id, checkAccess, searchParams, setSearchParams]);

  const handlePay = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const res = await api.post(`/product-payments/${id}/initiate`, {
        customer_name: 'Visiteur',
      });
      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        setPaymentError(res.data.message || 'Erreur paiement');
      }
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Erreur lors de l'initialisation du paiement");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement du produit...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Erreur</h3>
        <p className="error-message">{error}</p>
        <div className="error-actions">
          <button onClick={() => window.location.reload()}>Réessayer</button>
          <button onClick={() => navigate('/produits')}>Voir les produits</button>
        </div>
      </div>
    );
  }

  if (!produit) return null;

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
            }}
          />
        </div>

        <div className="product-info">
          <h1>{produit.nom}</h1>

          <div className="info-line"><strong>Catégorie :</strong>&nbsp;{produit.categorie}</div>
          <div className="info-line"><strong>Prix :</strong>&nbsp;{produit.prixFormatte}</div>
          <div className="info-line"><strong>Stock :</strong>&nbsp;{produit.stock} {produit.unite}</div>
          <div className="info-line"><strong>État :</strong>&nbsp;{produit.etat}</div>

          {produit.dateRecolte && (
            <div className="info-line">
              <strong>Date de récolte :</strong>&nbsp;
              {new Date(produit.dateRecolte).toLocaleDateString('fr-FR')}
            </div>
          )}

          {produit.description && (
            <div className="product-description">
              <h3>Description</h3>
              <p>{produit.description}</p>
            </div>
          )}

          {produit.tags && produit.tags.length > 0 && (
            <div className="product-description">
              <h3>Tags</h3>
              <div className="tags-container">
                {produit.tags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Seller section — gated */}
          <div className="seller-section">
            {accessState === 'checking' && (
              <div className="seller-checking">
                <div className="loading-spinner small"></div>
                <span>Vérification de l'accès...</span>
              </div>
            )}

            {accessState === 'granted' && seller && (
              <div className="seller-contact">
                <h3>Coordonnées du vendeur</h3>
                {seller.fermeNom && <p><strong>Ferme :</strong> {seller.fermeNom}</p>}
                {seller.nom && <p><strong>Nom :</strong> {seller.nom}</p>}
                {seller.contact && <p><strong>Téléphone :</strong> {seller.contact}</p>}
                {seller.email && <p><strong>Email :</strong> {seller.email}</p>}
                {seller.adresse && <p><strong>Localisation :</strong> {seller.adresse}</p>}
                {seller.typeExploitation && <p><strong>Type d'exploitation :</strong> {seller.typeExploitation}</p>}
              </div>
            )}

            {(accessState === 'denied' || accessState === 'idle') && (
              <div className="paywall-card">
                <div className="paywall-lock-icon">🔒</div>
                <h3>Coordonnées du vendeur</h3>
                <p className="paywall-desc">
                  Obtenez les coordonnées complètes du vendeur et de sa ferme pour le contacter directement.
                </p>
                <div className="paywall-price">300 FCFA</div>
                <p className="paywall-hint">Paiement unique — sans création de compte</p>
                {paymentError && <p className="paywall-error">{paymentError}</p>}
                <button
                  className="paywall-btn"
                  onClick={handlePay}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? 'Redirection...' : 'Voir les coordonnées — 300 FCFA'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="navigation-buttons">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        <button onClick={() => window.scrollTo(0, 0)} className="top-button">↑ Haut</button>
      </div>
    </div>
  );
}

export default ProductDetail;
