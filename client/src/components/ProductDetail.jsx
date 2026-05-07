import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import './ProductDetail.css';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import { useUser } from '../contexts/UserContext';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const ACCESS_KEY = (productId) => `pv_tx_${productId}`;

const formatFCFA = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' FCFA';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login } = useUser();

  const isConsumer = user?.role === 'consommateur';
  const price = isConsumer ? 150 : 300;

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [seller, setSeller] = useState(null);
  const [accessState, setAccessState] = useState('idle');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Modal connexion
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', motDePasse: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  const initiatePayment = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const res = await api.post(`/product-payments/${id}/initiate`, {
        customer_name: user?.nom || 'Visiteur',
        customer_email: user?.email || 'guest@vivrimarket.com',
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

  const handlePay = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      initiatePayment();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await api.post('/auth/connexion', loginForm);
      if (res.data.success) {
        login(res.data.utilisateur, res.data.token);
        setShowLoginModal(false);
        // Le token est maintenant dans les headers, le backend applique 150 FCFA
        setTimeout(initiatePayment, 100);
      } else {
        setLoginError(res.data.message || 'Identifiants incorrects');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoginLoading(false);
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
                <div className="paywall-price">
                  {isConsumer ? '150 FCFA' : '300 FCFA'}
                </div>
                <p className="paywall-hint">
                  {isConsumer ? 'Tarif consommateur inscrit' : 'Paiement unique — sans création de compte'}
                </p>
                {!user && (
                  <p className="paywall-signup-hint">
                    Payez seulement <strong>150 FCFA</strong> —{' '}
                    <a href="/inscription" className="paywall-signup-link">Créer un compte gratuit</a>
                  </p>
                )}
                {paymentError && <p className="paywall-error">{paymentError}</p>}
                <button className="paywall-btn" onClick={handlePay} disabled={paymentLoading}>
                  {paymentLoading ? 'Redirection...' : `Voir les coordonnées — ${isConsumer ? '150' : '300'} FCFA`}
                </button>
              </div>
            )}

            {/* Modal connexion */}
            {showLoginModal && (
              <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
                <div className="login-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Connectez-vous pour payer 150 FCFA</h3>
                  <p className="login-modal-sub">Compte consommateur requis</p>
                  <form onSubmit={handleLogin}>
                    <input
                      type="email"
                      placeholder="Adresse email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={loginForm.motDePasse}
                      onChange={(e) => setLoginForm((f) => ({ ...f, motDePasse: e.target.value }))}
                      required
                    />
                    {loginError && <p className="login-modal-error">{loginError}</p>}
                    <button type="submit" className="login-modal-btn" disabled={loginLoading}>
                      {loginLoading ? 'Connexion...' : 'Se connecter et payer 150 FCFA'}
                    </button>
                  </form>
                  <button
                    className="login-modal-skip"
                    onClick={() => { setShowLoginModal(false); initiatePayment(); }}
                  >
                    Continuer sans compte — 300 FCFA
                  </button>
                  <a href="/inscription?type=consommateur" className="login-modal-register">
                    Pas encore de compte ? S'inscrire gratuitement
                  </a>
                </div>
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
