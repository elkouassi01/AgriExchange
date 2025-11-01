import React, { useState, useEffect } from 'react';
import './ProductsPage.css';
import { useNavigate } from 'react-router-dom';

// Correction : Utilisation de window pour les variables d'environnement
const SERVER_BASE_URL = window.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

// Objet de traduction des catégories
const categoryTranslations = {
  'Vegetables': 'Légumes',
  'Fruits': 'Fruits',
  'Grains': 'Céréales',
  'Dairy': 'Produits Laitiers',
  'Meat': 'Viande',
  'Non classé': 'Non classé',
  'Uncategorized': 'Non classé',
  // Ajoutez d'autres traductions au besoin
};

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
      setError(null);
      
      const res = await fetch(`${SERVER_BASE_URL}/api/v1/products`);
      const data = await res.json();

      console.log('📦 Réponse API:', data);

      // Vérifier d'abord si c'est une erreur HTTP
      if (!res.ok) {
        throw new Error(data.message || `Erreur ${res.status}: ${res.statusText}`);
      }

      // Traiter les différents formats de réponse réussie
      if (Array.isArray(data)) {
        processProducts(data);
      } 
      else if (data.products && Array.isArray(data.products)) {
        processProducts(data.products);
      }
      else if (data.success && data.data && data.data.products) {
        processProducts(data.data.products);
      }
      else if (data.success && data.message) {
        // Si l'API renvoie {success: true, message: "Produits récupérés avec succès", data: {...}}
        if (data.data && data.data.products) {
          processProducts(data.data.products);
        } else if (data.data && Array.isArray(data.data)) {
          processProducts(data.data);
        } else {
          processProducts([]);
        }
      }
      else if (data.data && Array.isArray(data.data)) {
        processProducts(data.data);
      }
      else {
        throw new Error("Format de réponse inattendu de l'API");
      }
      
    } catch (err) {
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
      else if (err.message.includes('NetworkError')) {
        userMessage = "Erreur réseau. Vérifiez votre connexion Internet.";
      }
      
      setError(userMessage);
      console.error('❌ Erreur API:', err);
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
      ([nomOriginal, produits]) => {
        // Traduction du nom de catégorie
        const nomAffichage = categoryTranslations[nomOriginal] || nomOriginal;
        
        // Recherche d'une image valide dans la catégorie
        const validImageProduct = produits.find(p => 
          p.imageUrl && !p.imageUrl.includes('default') && !p.imageUrl.includes('placeholder')
        );
        
        return {
          nomOriginal,
          nomAffichage,
          produits,
          imageUrl: validImageProduct?.imageUrl || produits[0]?.imageUrl || ''
        };
      }
    );

    setCategories(categoriesArray);
    setError(null);
  };

  useEffect(() => {
    fetchProduits();
  }, []);

  const handleRefresh = () => {
    fetchProduits();
  };

  const handleCategoryClick = (categoryName) => {
    navigate(`/categories/${encodeURIComponent(categoryName)}`);
  };

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
          onClick={handleRefresh}
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
            onClick={handleRefresh}
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
            onClick={handleRefresh}
            className="product-button"
          >
            Recharger
          </button>
        </div>
      ) : (
        <>
          <div className="categories-stats">
            <p>{categories.length} catégorie(s) disponible(s)</p>
          </div>
          <div className="categories-grid">
            {categories.map((cat) => (
              <div key={cat.nomOriginal} className="category-card">
                <div className="product-image-container">
                  <ProductImage
                    src={cat.imageUrl}
                    alt={`Produits de la catégorie ${cat.nomAffichage}`}
                    onClick={() => handleCategoryClick(cat.nomOriginal)}
                  />
                </div>
                <div className="product-info">
                  <h3>{cat.nomAffichage}</h3>
                  <p>{cat.produits.length} produit(s)</p>
                </div>
                <button
                  className="product-button"
                  onClick={() => handleCategoryClick(cat.nomOriginal)}
                >
                  Voir les produits
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ProductsPage;