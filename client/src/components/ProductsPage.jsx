import React, { useState, useEffect } from 'react';
import './ProductsPage.css';
import { useNavigate } from 'react-router-dom';

const SERVER_BASE_URL = 'http://localhost:5000';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const ProductImage = ({ src, alt, onClick }) => {
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);

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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProduits = async () => {
    try {
      if (!loading) setRefreshing(true);
      
      const res = await fetch(`${SERVER_BASE_URL}/api/v1/products`);
      
      if (!res.ok) {
        // Essayer d'extraire le message d'erreur du corps de la réponse
        let errorMessage = `Erreur ${res.status}: ${res.statusText}`;
        
        try {
          const errorData = await res.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.warn("Échec d'analyse de la réponse d'erreur", parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log('📦 Réponse API:', data);

      // Gestion des différents formats de réponse
      if (Array.isArray(data)) {
        processProducts(data);
      } 
      else if (data.products && Array.isArray(data.products)) {
        processProducts(data.products);
      } 
      else if (data.message) {
        throw new Error(data.message);
      } 
      else {
        throw new Error("Format de données inattendu de l'API");
      }
    } catch (err) {
      // Traduction des erreurs techniques en messages conviviaux
      let userMessage = err.message;
      
      if (err.message.includes('Failed to fetch')) {
        userMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion Internet.";
      } 
      else if (err.message.includes('404')) {
        userMessage = "Ressource non trouvée. Le endpoint API a peut-être changé.";
      }
      else if (err.message.includes('500')) {
        userMessage = "Erreur interne du serveur. Veuillez réessayer plus tard.";
      }
      
      setError(userMessage);
      console.error('Erreur API:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processProducts = (products) => {
    console.log('🔁 Traitement de', products.length, 'produits');
    
    if (products.length === 0) {
      setError("Aucun produit disponible dans la base de données");
      setCategories([]);
      return;
    }
    
    const groupedByCategory = {};

    products.forEach((p) => {
      const cat = p.categorie || p.category || 'Non classé';
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = [];
      }
      groupedByCategory[cat].push(p);
    });

    const categoriesArray = Object.entries(groupedByCategory).map(
      ([nom, produits]) => ({
        nom,
        produits,
        imageUrl: produits.find(p => p.imageUrl)?.imageUrl || ''
      })
    );

    setCategories(categoriesArray);
    setError(null);
  };

  useEffect(() => {
    fetchProduits();
  }, []);

  if (loading) {
    return (
      <div className="products-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          Chargement des catégories...
        </div>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h2>🌾 Nos catégories de produits</h2>
        <button
          onClick={fetchProduits}
          className="refresh-button"
          disabled={refreshing}
          aria-label="Actualiser les produits"
        >
          ⟳ {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {error ? (
        <div className="error">
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <div className="error-details">
            <small>
              Conseil: Vérifiez que le serveur est en marche à {SERVER_BASE_URL}
            </small>
          </div>
          <button
            onClick={fetchProduits}
            className="product-button"
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation...' : 'Réessayer'}
          </button>
        </div>
      ) : categories.length === 0 ? (
        <div className="no-products">
          <p>Aucune catégorie disponible actuellement</p>
          <button
            onClick={fetchProduits}
            className="product-button"
          >
            Recharger
          </button>
        </div>
      ) : (
        <div className="categories-grid">
          {categories.map((cat) => (
            <div key={cat.nom} className="category-card">
              <div className="product-image-container">
                <ProductImage
                  src={cat.imageUrl}
                  alt={`Produits de la catégorie ${cat.nom}`}
                  onClick={() => navigate(`/categories/${encodeURIComponent(cat.nom)}`)}
                />
              </div>
              <div className="product-info">
                <h3>{cat.nom}</h3>
                <p>{cat.produits.length} produit(s)</p>
              </div>
              <button
                className="product-button"
                onClick={() => navigate(`/categories/${encodeURIComponent(cat.nom)}`)}
              >
                Voir les produits
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsPage;