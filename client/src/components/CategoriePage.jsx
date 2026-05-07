import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/axiosConfig';
import { useUser } from '../contexts/UserContext';
import './CategoriePage.css';
import { buildUploadUrl } from '../config/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const ProductImage = ({ src, alt }) => {
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
    />
  );
};

const CategoriePage = () => {
  const { nomCategorie } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const fetchProduits = async () => {
      try {
        setLoading(true);
        setErreur(null);

        const res = await api.get('/products');
        const data = res.data;

        let produitsData = [];
        if (Array.isArray(data)) produitsData = data;
        else if (data.products) produitsData = data.products;
        else if (data.data?.products) produitsData = data.data.products;
        else if (Array.isArray(data.data)) produitsData = data.data;
        else throw new Error('Format de reponse API invalide');

        const produitsFiltres = produitsData.filter((produit) => {
          const categorie = (produit.categorie || produit.category || '').toLowerCase();
          return categorie === nomCategorie.toLowerCase();
        });

        const formattes = produitsFiltres.map((produit) => ({
          ...produit,
          nom: produit.nom || produit.name || 'Produit sans nom',
          description: produit.description || '',
          imageUrl: produit.imageUrl || produit.image || '',
          prix: `${Number(produit.prix || produit.price || 0).toLocaleString('fr-FR')} FCFA / ${produit.unite || produit.unit || 'kg'}`,
        }));

        setProduits(formattes);
      } catch (err) {
        console.error('Erreur chargement produits :', err);
        let msg = 'Erreur lors du chargement des produits';
        if (err.message.includes('Network')) msg = 'Impossible de joindre le serveur.';
        else if (err.response?.status === 404) msg = 'Ressource introuvable.';
        else if (err.response?.status === 500) msg = 'Erreur interne du serveur.';
        setErreur(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProduits();
  }, [nomCategorie]);

  const handleVoirPlusClick = (produitId) => {
    navigate(`/produits/${produitId}`);
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Chargement des produits...</p></div>;
  if (erreur) return <div className="error-container"><h3>Erreur</h3><p>{erreur}</p><button onClick={() => window.location.reload()}>Reessayer</button></div>;
  if (produits.length === 0) return <div className="empty-container"><h3>Aucun produit trouve</h3><button onClick={() => navigate('/categories')}>Retour aux categories</button></div>;

  return (
    <div className="category-container">
      <div className="category-header">
        <h1>{nomCategorie}</h1>
        <span>{produits.length} produit(s)</span>
      </div>

      <div className="products-grid">
        {produits.map((produit) => (
          <div key={produit._id} className="product-card">
            <ProductImage src={produit.imageUrl} alt={produit.nom} />
            <h3>{produit.nom}</h3>
            {produit.description && <p>{produit.description}</p>}
            <p className="product-price">{produit.prix}</p>
            <button onClick={() => handleVoirPlusClick(produit._id)}>Voir Fournisseur</button>
          </div>
        ))}
      </div>

      <div className="category-footer">
        <button onClick={() => navigate('/categories')}>Categories</button>
        <button onClick={() => navigate('/')}>Accueil</button>
      </div>
    </div>
  );
};

export default CategoriePage;
