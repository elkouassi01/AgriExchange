import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import './ProductDetail.css';
import { Eye, Lock, ShoppingCart } from 'lucide-react';
import api from '../services/axiosConfig'; 

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
  const { user, refreshUserData } = useUser(); // Ajout de refreshUserData pour mettre à jour les données utilisateur

  const [produit, setProduit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [remainingViews, setRemainingViews] = useState(null);

  // Vérifier l'accès au produit
  useEffect(() => {
    const checkProductAccess = async () => {
      setAccessLoading(true);
      setAccessError(null);
      
      try {
        // Si l'utilisateur n'est pas connecté, accès refusé
        if (!user) {
          setAccessGranted(false);
          setAccessError('Vous devez vous connecter pour accéder à ce produit');
          setAccessLoading(false);
          return;
        }

        // Vérifier l'accès via l'API avec axios
        const accessRes = await api.get(`/users/products/${id}/can-access`);
        
        if (accessRes.data.canAccess) {
          setAccessGranted(true);
          
          // Enregistrer la vue si l'accès est autorisé
          try {
            const viewRes = await api.post(`/users/${user._id}/consume-view`, { productId: id });
            
            // Mettre à jour les vues restantes
            if (viewRes.data.viewsRemaining !== undefined) {
              setRemainingViews(viewRes.data.viewsRemaining);
            }
            
            // Actualiser les données utilisateur pour refléter la nouvelle vue
            await refreshUserData();
          } catch (viewError) {
            console.error("Erreur d'enregistrement de la vue:", viewError.response?.data?.message || viewError.message);
          }
        } else {
          setAccessGranted(false);
          setAccessError(accessRes.data.message || "Accès refusé");
        }
      } catch (err) {
        setAccessGranted(false);
        setAccessError(err.response?.data?.message || err.message || "Erreur lors de la vérification d'accès");
      } finally {
        setAccessLoading(false);
      }
    };

    // Charger le produit uniquement si l'accès est autorisé
    const fetchProduit = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
          setError("ID de produit invalide");
          setLoading(false);
          return;
        }

        // Utilisation de l'API axios configurée
        const res = await api.get(`/products/${id}`);
        const product = res.data.product || res.data;

        if (!product || !product._id) {
          setError("Produit introuvable");
          setLoading(false);
          return;
        }

        let imageUrl = product.imageUrl || DEFAULT_IMAGE;
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('blob:')) {
          if (imageUrl.startsWith('/uploads/')) {
            imageUrl = `${api.defaults.baseURL.replace('/api/v1', '')}${imageUrl}`;
          } else if (!imageUrl.startsWith('/')) {
            imageUrl = `${api.defaults.baseURL.replace('/api/v1', '')}/uploads/${imageUrl}`;
          } else {
            imageUrl = `${api.defaults.baseURL.replace('/api/v1', '')}${imageUrl}`;
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
        // Gestion des erreurs avec message utilisateur
        if (err.response) {
          if (err.response.status === 401) {
            setError('Session expirée. Veuillez vous reconnecter.');
          } else if (err.response.status === 403) {
            setError('Permission refusée pour accéder à ce produit');
          } else {
            setError(err.response.data?.message || `Erreur ${err.response.status}`);
          }
        } else if (err.request) {
          setError("Erreur réseau: Impossible de contacter le serveur");
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (accessGranted) {
      fetchProduit();
    } else {
      checkProductAccess();
    }
  }, [id, user, accessGranted, refreshUserData]);

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: `/products/${id}` } });
  };

  const handleUpgradeRedirect = () => {
    navigate('/offres');
  };

  if (accessLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Vérification de votre accès au produit...</p>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-card">
          <Lock size={48} color="#c62828" />
          <h2>Accès restreint</h2>
          
          <div className="access-denied-message">
            <p>{accessError || "Vous n'avez pas accès à ce produit"}</p>
            {remainingViews !== null && (
              <div className="views-remaining">
                <Eye size={16} />
                <span>Vues restantes ce mois : {remainingViews}</span>
              </div>
            )}
          </div>

          <div className="access-denied-actions">
            {!user ? (
              <button 
                onClick={handleLoginRedirect}
                className="login-button"
              >
                Se connecter
              </button>
            ) : (
              <button 
                onClick={handleUpgradeRedirect}
                className="upgrade-button"
              >
                Mettre à niveau mon abonnement
              </button>
            )}
            
            <button onClick={() => navigate('/categories')} className="back-button">
              Voir d'autres produits
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="error-actions">
          <button onClick={() => window.location.reload()}>Réessayer</button>
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
          
          {remainingViews !== null && (
            <div className="views-badge">
              <Eye size={16} />
              <span>Vues restantes: {remainingViews}</span>
            </div>
          )}
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