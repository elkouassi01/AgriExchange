import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/axiosConfig';
import { useUser } from '../contexts/UserContext';
import './CategoriePage.css';

// URL de secours utilisée si l'image du produit est manquante ou non accessible
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

/**
 * Composant pour afficher l'image d'un produit
 * - Gère les différentes sources d'URL (absolute, relative)
 * - Utilise une image par défaut si l'image n'existe pas ou erreur de chargement
 */
const ProductImage = ({ src, alt }) => {
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);
  const SERVER_BASE_URL = window.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!src) {
      setImageSrc(DEFAULT_IMAGE);
      return;
    }

    let finalUrl;

    if (src.startsWith('http')) {
      finalUrl = src;
    } else if (src.startsWith('/uploads')) {
      finalUrl = `${SERVER_BASE_URL}${src}`;
    } else {
      finalUrl = `${SERVER_BASE_URL}/uploads/${src}`;
    }

    console.log('🖼️ Chargement image produit:', finalUrl);
    setImageSrc(finalUrl);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="product-image"
      onError={(e) => {
        console.error('❌ Erreur chargement image produit:', e);
        setImageSrc(DEFAULT_IMAGE);
      }}
    />
  );
};

/**
 * Page affichant les produits d'une catégorie donnée
 * - Récupère les produits via l'API
 * - Filtre par catégorie (paramètre URL)
 * - Gestion des états : chargement, erreur, vide
 * - Vérification de l'accès aux détails produit selon abonnement et rôle utilisateur
 */
const CategoriePage = () => {
  const { nomCategorie } = useParams(); // Récupère le paramètre catégorie de l'URL
  const [produits, setProduits] = useState([]); // Liste des produits à afficher
  const [loading, setLoading] = useState(true); // État chargement
  const [erreur, setErreur] = useState(null);   // Message d'erreur éventuel
  const navigate = useNavigate();                // Navigation programmatique
  const { user } = useUser();                    // Utilisateur connecté (contexte global)

  // Récupère les produits à chaque changement de catégorie
  useEffect(() => {
    const fetchProduits = async () => {
      try {
        setLoading(true);
        setErreur(null);
        
        console.log(`📋 Chargement produits pour catégorie: ${nomCategorie}`);
        const res = await api.get('/products');
        const data = res.data;

        console.log('📦 Réponse API produits:', data);

        let produitsData = [];

        // Gestion des différents formats de réponse
        if (Array.isArray(data)) {
          produitsData = data;
        }
        else if (data.products && Array.isArray(data.products)) {
          produitsData = data.products;
        }
        else if (data.success && data.data && Array.isArray(data.data.products)) {
          produitsData = data.data.products;
        }
        else if (data.success && data.data && Array.isArray(data.data)) {
          produitsData = data.data;
        }
        else if (data.message && !data.success) {
          throw new Error(data.message);
        }
        // Format inattendu
        else {
          throw new Error("Format de réponse inattendu de l'API");
        }

        // Filtre les produits selon la catégorie demandée (insensible à la casse)
        const produitsFiltres = produitsData.filter((p) => {
          const categorieProduit = (p.categorie || p.category || 'Non classé').toLowerCase();
          const categorieRecherche = nomCategorie.toLowerCase();
          return categorieProduit === categorieRecherche;
        });

        console.log(`✅ ${produitsFiltres.length} produit(s) trouvé(s) pour "${nomCategorie}"`);

        // Formate chaque produit pour l'affichage : prix formaté + imageUrl par défaut si vide
        const produitsFormattes = produitsFiltres.map((p) => ({
          ...p,
          prix: `${Number(p.prix || p.price || 0).toLocaleString('fr-FR')} FCFA / ${p.unite || p.unit || 'kg'}`,
          imageUrl: p.imageUrl || p.image || '',
          nom: p.nom || p.name || 'Produit sans nom',
          description: p.description || p.desc || ''
        }));

        setProduits(produitsFormattes);
        
      } catch (err) {
        console.error('❌ Erreur chargement produits:', err);
        
        let errorMessage = err.message || 'Erreur lors du chargement des produits';
        
        // Gestion spécifique des erreurs réseau
        if (err.message.includes('Network Error') || err.message.includes('ERR_NAME_NOT_RESOLVED')) {
          errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion Internet.";
        }
        else if (err.response?.status === 404) {
          errorMessage = "La ressource demandée n'a pas été trouvée.";
        }
        else if (err.response?.status === 500) {
          errorMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
        }
        
        setErreur(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProduits();
  }, [nomCategorie]);

  /**
   * Gestion du clic sur le bouton "Voir Fournisseur"
   * Vérifie :
   * 1. Si l'utilisateur est connecté
   * 2. S'il a le rôle "consommateur"
   * 3. S'il a le droit d'accéder à ce produit selon son abonnement
   */
  const handleVoirPlusClick = async (produitId) => {
    // 1. Utilisateur non connecté
    if (!user) {
      const confirmRedirect = window.confirm(
        "Vous n'êtes pas inscrit sur AgriMarket. Souhaitez-vous créer votre compte ?"
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
      return;
    }

    // 2. Utilisateur connecté mais n'est pas consommateur
    if (user.role !== 'consommateur') {
      const confirmRedirect = window.confirm(
        "Seuls nos abonnés peuvent consulter les détails des producteurs. Souhaitez-vous consulter les offres d'abonnement adaptées ?"
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
      return;
    }

    // 3. Vérification de l'accès via l'API
    try {
      console.log(`🔐 Vérification accès pour produit: ${produitId}`);
      const res = await api.get(`/users/products/${produitId}/can-access`);
      const { accessGranted, message } = res.data;

      if (accessGranted) {
        // Accès autorisé : navigation vers la page détail produit
        navigate(`/produits/${produitId}`);
      } else {
        // Accès refusé : proposition de voir les offres
        const confirmRedirect = window.confirm(
          message || "Vous avez atteint votre limite de consultation de produits pour ce mois ou votre abonnement est inactif. Souhaitez-vous voir les offres disponibles ?"
        );
        if (confirmRedirect) {
          navigate('/offres');
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors de la vérification de l'abonnement :", error);
      
      let errorMessage = "Une erreur est survenue lors de la vérification de votre abonnement.";
      
      if (error.response?.status === 403) {
        errorMessage = "Accès refusé. Vérifiez votre abonnement.";
      } else if (error.response?.status === 404) {
        errorMessage = "Produit non trouvé.";
      }
      
      const confirmRedirect = window.confirm(
        `${errorMessage} Voulez-vous consulter les offres disponibles ?`
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
    }
  };

  // Fonction pour recharger la page
  const handleRetry = () => {
    window.location.reload();
  };

  // Fonction pour retourner aux catégories
  const handleBackToCategories = () => {
    navigate('/categories');
  };

  // Affichage : état de chargement avec spinner
  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Chargement des produits de la catégorie "{nomCategorie}"...</p>
    </div>
  );

  // Affichage : erreur de chargement avec boutons de retry et retour
  if (erreur) return (
    <div className="error-container">
      <h3>🚫 Erreur de chargement</h3>
      <p>{erreur}</p>
      <div className="error-actions">
        <button className="retry-button" onClick={handleRetry}>
          ↻ Réessayer
        </button>
        <button className="back-button" onClick={handleBackToCategories}>
          ← Retour aux catégories
        </button>
        <button className="home-button" onClick={() => navigate('/')}>
          🏠 Accueil
        </button>
      </div>
    </div>
  );

  // Affichage : aucun produit trouvé pour la catégorie
  if (produits.length === 0) return (
    <div className="empty-container">
      <div className="empty-icon">📭</div>
      <h3>Aucun produit trouvé</h3>
      <p>La catégorie "{nomCategorie}" ne contient aucun produit pour le moment.</p>
      <div className="empty-actions">
        <button className="primary-button" onClick={handleBackToCategories}>
          Voir toutes les catégories
        </button>
        <button className="secondary-button" onClick={handleRetry}>
          Actualiser
        </button>
      </div>
    </div>
  );

  // Affichage : liste des produits avec image, nom, description, prix et bouton d'action
  return (
    <div className="category-container">
      <div className="category-header">
        <div className="header-content">
          <h1>📦 Produits : {nomCategorie}</h1>
          <span className="product-count">
            {produits.length} produit{produits.length > 1 ? 's' : ''}
          </span>
        </div>
        <button 
          className="back-categories-button"
          onClick={handleBackToCategories}
        >
          ← Retour aux catégories
        </button>
      </div>

      <div className="products-grid">
        {produits.map((produit) => (
          <div key={produit._id || produit.id} className="product-card">
            <div className="image-container">
              <ProductImage src={produit.imageUrl} alt={produit.nom} />
            </div>
            <div className="product-info">
              <h3 className="product-name">{produit.nom}</h3>
              {produit.description && (
                <p className="product-description">{produit.description}</p>
              )}
              <p className="product-price">{produit.prix}</p>
              <button
                className="product-button"
                onClick={() => handleVoirPlusClick(produit._id || produit.id)}
              >
                👁️ Voir Fournisseur
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pied de page avec navigation */}
      <div className="category-footer">
        <button 
          className="back-categories-button"
          onClick={handleBackToCategories}
        >
          ← Retour aux catégories
        </button>
        <button 
          className="home-button"
          onClick={() => navigate('/')}
        >
          🏠 Page d'accueil
        </button>
      </div>
    </div>
  );
};

export default CategoriePage;