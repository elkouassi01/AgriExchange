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
  const SERVER_BASE_URL = 'http://localhost:5000'; // URL backend

  useEffect(() => {
    if (!src) {
      setImageSrc(DEFAULT_IMAGE);
    } else if (src.startsWith('http')) {
      setImageSrc(src);
    } else if (src.startsWith('/uploads')) {
      setImageSrc(`${SERVER_BASE_URL}${src}`);
    } else {
      setImageSrc(`${SERVER_BASE_URL}/uploads/${src}`);
    }
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="product-image"
      onError={() => setImageSrc(DEFAULT_IMAGE)} // En cas d'erreur de chargement
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
        const res = await api.get('/products');
        const data = res.data;

        let produitsData = [];

        // Cas 1 : l'API retourne un tableau directement
        if (Array.isArray(data)) {
          produitsData = data;
        }
        // Cas 2 : l'API retourne un objet avec une clé "products" contenant le tableau
        else if (data.products && Array.isArray(data.products)) {
          produitsData = data.products;
        }
        // Format inattendu
        else {
          throw new Error("Format de réponse inattendu de l'API");
        }

        // Filtre les produits selon la catégorie demandée (insensible à la casse)
        const produitsFiltres = produitsData.filter(
          (p) => (p.categorie || 'Non classé').toLowerCase() === nomCategorie.toLowerCase()
        );

        // Formate chaque produit pour l'affichage : prix formaté + imageUrl par défaut si vide
        const produitsFormattes = produitsFiltres.map((p) => ({
          ...p,
          prix: `${Number(p.prix).toLocaleString('fr-FR')} FCFA / ${p.unite || 'kg'}`,
          imageUrl: p.imageUrl || '',
        }));

        setProduits(produitsFormattes);
        setErreur(null);
      } catch (err) {
        setErreur(err.message || 'Erreur lors du chargement des produits');
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
        "Vous devez être connecté pour accéder aux détails du produit. Souhaitez-vous consulter nos offres d'abonnement ?"
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
      return;
    }

    // 2. Utilisateur connecté mais n'est pas consommateur
    if (user.role !== 'consommateur') {
      const confirmRedirect = window.confirm(
        "Seuls les consommateurs peuvent consulter les détails des produits. Souhaitez-vous consulter les offres d’abonnement adaptées ?"
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
      return;
    }

    // 3. Vérification de l'accès via l'API
    try {
      const res = await api.get(`/users/products/${produitId}/can-access`);
      const { accessGranted } = res.data;

      if (accessGranted) {
        // Accès autorisé : navigation vers la page détail produit
        navigate(`/produits/${produitId}`);
      } else {
        // Accès refusé : proposition de voir les offres
        const confirmRedirect = window.confirm(
          "Vous avez atteint votre limite de consultation de produits pour ce mois ou votre abonnement est inactif. Souhaitez-vous voir les offres disponibles ?"
        );
        if (confirmRedirect) {
          navigate('/offres');
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'abonnement :", error);
      const confirmRedirect = window.confirm(
        "Une erreur est survenue lors de la vérification de votre abonnement. Voulez-vous consulter les offres disponibles ?"
      );
      if (confirmRedirect) {
        navigate('/offres');
      }
    }
  };

  // Affichage : état de chargement avec spinner
  if (loading) return (
    <div className="loading-container">
      <p>Chargement des produits de la catégorie "{nomCategorie}"...</p>
      <div className="loading-spinner"></div>
    </div>
  );

  // Affichage : erreur de chargement avec boutons de retry et retour
  if (erreur) return (
    <div className="error-container">
      <h3>Erreur de chargement</h3>
      <p>{erreur}</p>
      <button className="retry-button" onClick={() => window.location.reload()}>
        Réessayer
      </button>
      <button className="back-button" onClick={() => navigate('/')}>
        Retour à l'accueil
      </button>
    </div>
  );

  // Affichage : aucun produit trouvé pour la catégorie
  if (produits.length === 0) return (
    <div className="empty-container">
      <p>Aucun produit trouvé pour la catégorie "{nomCategorie}"</p>
      <button onClick={() => navigate('/categories')}>
        Voir toutes les catégories
      </button>
    </div>
  );

  // Affichage : liste des produits avec image, nom, description, prix et bouton d'action
  return (
    <div className="category-container">
      <div className="category-header">
        <h1>Produits de la catégorie : {nomCategorie}</h1>
        <span className="product-count">{produits.length} produit{produits.length > 1 ? 's' : ''}</span>
      </div>

      <div className="products-grid">
        {produits.map((produit) => (
          <div key={produit._id} className="product-card">
            {/* Conteneur image pour appliquer le style CSS */}
            <div className="image-container">
              <ProductImage src={produit.imageUrl} alt={produit.nom} />
            </div>
            <div className="product-info">
              <h3>{produit.nom}</h3>
              {produit.description && (
                <p className="product-description">{produit.description}</p>
              )}
              {/* Prix en rouge pour attirer l'attention */}
              <p className="product-price">{produit.prix}</p>
              <button
                className="product-button"
                onClick={() => handleVoirPlusClick(produit._id)}
              >
                Voir Fournisseur {/* Correction orthographe ici */}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriePage;
