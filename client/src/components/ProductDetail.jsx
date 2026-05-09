import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import './ProductDetail.css';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import { useUser } from '../contexts/UserContext';
import { PRICE_CONSUMER, PRICE_VISITOR, DEFAULT_PRODUCT_IMAGE } from '../config/constants';
import SellerReviews from './SellerReviews';

const DEFAULT_IMAGE = DEFAULT_PRODUCT_IMAGE;

const ACCESS_KEY = (productId) => `pv_tx_${productId}`;

// ── Galerie ──────────────────────────────────────────────────────────────────

function ProductGallery({ mainImage, images }) {
  const allImages = [mainImage, ...(images || [])].filter(Boolean).filter((u, i, arr) => arr.indexOf(u) === i);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Navigation lightbox avec les flèches clavier
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setActive((i) => (i + 1) % allImages.length);
      else if (e.key === 'ArrowLeft') setActive((i) => (i - 1 + allImages.length) % allImages.length);
      else if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, allImages.length]);

  return (
    <div className="pg-root">
      {/* Image principale */}
      <div className="pg-main" onClick={() => setLightbox(true)} title="Cliquer pour agrandir">
        <img
          src={allImages[active] || DEFAULT_IMAGE}
          alt="Photo du produit"
          className="pg-main__img"
          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
        />
        {allImages.length > 1 && (
          <span className="pg-main__counter">{active + 1} / {allImages.length}</span>
        )}
        <span className="pg-main__zoom">🔍</span>
      </div>

      {/* Bande de vignettes */}
      {allImages.length > 1 && (
        <div className="pg-thumbs">
          {allImages.map((url, i) => (
            <button
              key={i}
              className={`pg-thumb ${i === active ? 'pg-thumb--active' : ''}`}
              onClick={() => setActive(i)}
            >
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="pg-lightbox" onClick={() => setLightbox(false)}>
          <div className="pg-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <button className="pg-lb-close" onClick={() => setLightbox(false)}>✕</button>

            {allImages.length > 1 && (
              <button
                className="pg-lb-nav pg-lb-nav--prev"
                onClick={() => setActive((i) => (i - 1 + allImages.length) % allImages.length)}
              >
                ‹
              </button>
            )}

            <img
              src={allImages[active] || DEFAULT_IMAGE}
              alt="Photo agrandie"
              className="pg-lightbox__img"
              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMAGE; }}
            />

            {allImages.length > 1 && (
              <button
                className="pg-lb-nav pg-lb-nav--next"
                onClick={() => setActive((i) => (i + 1) % allImages.length)}
              >
                ›
              </button>
            )}

            {allImages.length > 1 && (
              <div className="pg-lb-dots">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    className={`pg-lb-dot ${i === active ? 'pg-lb-dot--active' : ''}`}
                    onClick={() => setActive(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const formatFCFA = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'decimal', minimumFractionDigits: 0 }).format(amount) + ' FCFA';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, login } = useUser();

  const isConsumer = user?.role === 'consommateur';
  const price = isConsumer ? PRICE_CONSUMER : PRICE_VISITOR;

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [seller, setSeller] = useState(null);
  const [accessState, setAccessState] = useState('idle');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Modal connexion / infos visiteur
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalStep, setModalStep] = useState('login'); // 'login' | 'visitor'
  const [loginForm, setLoginForm] = useState({ email: '', motDePasse: '' });
  const [visitorForm, setVisitorForm] = useState({ email: '', phone: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const VISITOR_KEY = (pid) => `visitor_info_${pid}`;

  const checkAccess = useCallback(async (txId) => {
    setAccessState('checking');
    try {
      // Récupérer les infos visiteur stockées avant le paiement
      const visitorRaw = localStorage.getItem(VISITOR_KEY(id));
      const visitor = visitorRaw ? JSON.parse(visitorRaw) : {};
      const params = new URLSearchParams({ tx_id: txId });
      if (visitor.phone) params.set('buyer_phone', visitor.phone);
      if (visitor.email) params.set('buyer_email', visitor.email);

      const res = await api.get(`/product-payments/${id}/check?${params.toString()}`);
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
        const images = Array.isArray(product.images)
          ? product.images.map((u) => buildUploadUrl(u) || u).filter(Boolean)
          : [];

        setProduit({ ...product, prixFormatte, imageUrl, images });
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

  const initiatePayment = async (visitorInfo = null) => {
    setPaymentLoading(true);
    setPaymentError('');
    // Stocker les infos visiteur avant redirect CinetPay
    if (visitorInfo) {
      localStorage.setItem(VISITOR_KEY(id), JSON.stringify(visitorInfo));
    }
    try {
      const res = await api.post(`/product-payments/${id}/initiate`, {
        customer_name: user?.nom || visitorInfo?.name || 'Visiteur',
        customer_email: user?.email || visitorInfo?.email || 'guest@vivrimarket.com',
        customer_phone: visitorInfo?.phone || '',
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
      setModalStep('login');
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

  const handleVisitorPay = async (e) => {
    e.preventDefault();
    setShowLoginModal(false);
    // Envoyer le message WhatsApp de bienvenue (sans bloquer le paiement)
    api.post('/auth/welcome-visitor', {
      phone: visitorForm.phone,
      email: visitorForm.email,
    }).catch(() => {/* silencieux — le paiement continue même si le WA échoue */});
    initiatePayment({ email: visitorForm.email, phone: visitorForm.phone });
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
          <ProductGallery mainImage={produit.imageUrl} images={produit.images} />
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
                {user && produit.sellerId && (
                  <Link
                    to={`/messages?with=${produit.sellerId}&nom=${encodeURIComponent(seller.nom || seller.fermeNom || 'Vendeur')}`}
                    className="seller-contact-btn"
                  >
                    💬 Contacter le vendeur
                  </Link>
                )}
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
                  {isConsumer ? `${PRICE_CONSUMER} FCFA` : `${PRICE_VISITOR} FCFA`}
                </div>
                <p className="paywall-hint">
                  {isConsumer ? 'Tarif consommateur inscrit' : 'Paiement unique — sans creation de compte'}
                </p>
                {!user && (
                  <p className="paywall-signup-hint">
                    Payez seulement <strong>{PRICE_CONSUMER} FCFA</strong> —{' '}
                    <a href="/inscription" className="paywall-signup-link">Créer un compte gratuit</a>
                  </p>
                )}
                {paymentError && <p className="paywall-error">{paymentError}</p>}
                <button className="paywall-btn" onClick={handlePay} disabled={paymentLoading}>
                  {paymentLoading ? 'Redirection...' : `Voir les coordonnees — ${isConsumer ? PRICE_CONSUMER : PRICE_VISITOR} FCFA`}
                </button>
              </div>
            )}

            {/* Modal connexion / infos visiteur */}
            {showLoginModal && (
              <div className="login-modal-overlay" onClick={() => setShowLoginModal(false)}>
                <div className="login-modal" onClick={(e) => e.stopPropagation()}>

                  {modalStep === 'login' && (
                    <>
                      <h3>Connectez-vous pour payer {PRICE_CONSUMER} FCFA</h3>
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
                          {loginLoading ? 'Connexion...' : `Se connecter et payer ${PRICE_CONSUMER} FCFA`}
                        </button>
                      </form>
                      <button className="login-modal-btn" onClick={() => setModalStep('visitor')}>
                        Continuer sans compte
                      </button>
                      <a href="/inscription?type=consommateur" className="login-modal-register">
                        Pas encore de compte ? S'inscrire gratuitement
                      </a>
                    </>
                  )}

                  {modalStep === 'visitor' && (
                    <>
                      <h3>Restez informé de votre commande</h3>
                      <p className="login-modal-sub">Votre WhatsApp & email pour vous notifier</p>
                      <form onSubmit={handleVisitorPay}>
                        <input
                          type="email"
                          placeholder="Adresse email *"
                          value={visitorForm.email}
                          onChange={(e) => setVisitorForm((f) => ({ ...f, email: e.target.value }))}
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Numéro WhatsApp (ex: +2250700000000) *"
                          value={visitorForm.phone}
                          onChange={(e) => setVisitorForm((f) => ({ ...f, phone: e.target.value }))}
                          required
                        />
                        <button type="submit" className="login-modal-btn" disabled={paymentLoading}>
                          {paymentLoading ? 'Redirection...' : `Payer ${PRICE_VISITOR} FCFA`}
                        </button>
                      </form>
                      <button className="login-modal-btn" onClick={() => setModalStep('login')}>
                        Retour / Se connecter
                      </button>
                    </>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avis sur le vendeur */}
      {produit.sellerId && (
        <div className="product-reviews-wrapper">
          <SellerReviews sellerId={produit.sellerId} />
        </div>
      )}

      <div className="navigation-buttons">
        <button onClick={() => navigate(-1)} className="back-button">← Retour</button>
        <button onClick={() => window.scrollTo(0, 0)} className="top-button">↑ Haut</button>
      </div>
    </div>
  );
}

export default ProductDetail;
