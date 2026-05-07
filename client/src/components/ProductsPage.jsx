import React, { useCallback, useEffect, useState } from 'react';
import './ProductsPage.css';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, buildUploadUrl } from '../config/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const categoryTranslations = {
  Vegetables: 'Legumes',
  Fruits: 'Fruits',
  Grains: 'Cereales',
  Dairy: 'Produits Laitiers',
  Meat: 'Viande',
  'Non classe': 'Non classe',
  Uncategorized: 'Non classe',
};

const ProductImage = ({ src, alt, onClick }) => {
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);

  useEffect(() => {
    if (!src) {
      setImageSrc(DEFAULT_IMAGE);
      return;
    }

    setImageSrc(buildUploadUrl(src));
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

  const processProducts = useCallback((products) => {
    if (!products.length) {
      setCategories([]);
      return;
    }

    const grouped = {};
    products.forEach((product) => {
      const category = product.categorie || product.category || 'Non classe';
      (grouped[category] ||= []).push(product);
    });

    setCategories(
      Object.entries(grouped).map(([original, prods]) => {
        const imageUrl =
          prods.find((product) => product.imageUrl && !product.imageUrl.includes('default'))?.imageUrl ||
          prods[0]?.imageUrl ||
          '';

        return {
          nomOriginal: original,
          nomAffichage: categoryTranslations[original] || original,
          produits: prods,
          imageUrl,
        };
      })
    );
    setError(null);
  }, []);

  const fetchProduits = useCallback(async () => {
    try {
      setRefreshing((prev) => (!loading ? true : prev));
      setError(null);

      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}`);
      }

      if (Array.isArray(data)) processProducts(data);
      else if (Array.isArray(data.products)) processProducts(data.products);
      else if (data.success && data.data?.products) processProducts(data.data.products);
      else if (data.success && Array.isArray(data.data)) processProducts(data.data);
      else throw new Error('Format de reponse inattendu');
    } catch (err) {
      const message = err.message.includes('Failed to fetch')
        ? 'Impossible de joindre le serveur.'
        : err.message;
      setError(message);
      console.error('Erreur API:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, processProducts]);

  useEffect(() => {
    fetchProduits();
  }, [fetchProduits]);

  const handleRefresh = () => fetchProduits();
  const handleCategoryClick = (category) => navigate(`/categories/${encodeURIComponent(category)}`);

  if (loading) {
    return (
      <div className="products-container">
        <div className="loading"><div className="loading-spinner" />Chargement des categories...</div>
      </div>
    );
  }

  return (
    <div className="products-container">
      <div className="products-header">
        <h2>Nos categories de produits</h2>
        <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      {error ? (
        <div className="error">
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <small>Verifiez que le serveur est joignable a l'adresse {API_BASE_URL}</small>
          <button className="product-button" onClick={handleRefresh} disabled={refreshing}>
            Reessayer
          </button>
        </div>
      ) : !categories.length ? (
        <div className="no-products">
          <p>Aucun produit pour le moment, revenez bientôt !</p>
          <button className="product-button" onClick={handleRefresh}>Recharger</button>
        </div>
      ) : (
        <>
          <div className="categories-stats">
            <p>{categories.length} categorie(s) disponible(s)</p>
          </div>
          <div className="categories-grid">
            {categories.map((category) => (
              <div key={category.nomOriginal} className="category-card">
                <div className="product-image-container">
                  <ProductImage
                    src={category.imageUrl}
                    alt={category.nomAffichage}
                    onClick={() => handleCategoryClick(category.nomOriginal)}
                  />
                </div>
                <div className="product-info">
                  <h3>{category.nomAffichage}</h3>
                  <p>{category.produits.length} produit(s)</p>
                </div>
                <button className="product-button" onClick={() => handleCategoryClick(category.nomOriginal)}>
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
