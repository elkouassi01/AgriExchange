import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MesProduits.css';
import { buildApiUrl, buildUploadUrl } from '../config/api';

const MesProduits = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const getStatutProduit = (produit) => {
    const quantite = produit.quantite || produit.quantity || produit.stock || 0;

    if (quantite === 0) return 'Epuise';
    if (quantite <= 10) return 'Bientot epuise';
    return 'Disponible';
  };

  const fetchMesProduits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Vous devez etre connecte pour voir vos produits');
      }

      const response = await fetch(buildApiUrl('/products/my-products'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      let produitsData = [];
      if (Array.isArray(data)) produitsData = data;
      else if (Array.isArray(data.products)) produitsData = data.products;
      else if (data.success && Array.isArray(data.data?.products)) produitsData = data.data.products;
      else if (data.success && Array.isArray(data.data)) produitsData = data.data;
      else if (Array.isArray(data.data)) produitsData = data.data;
      else throw new Error("Format de reponse inattendu de l'API");

      setProduits(
        produitsData.map((produit) => ({
          id: produit._id || produit.id,
          nom: produit.nom || produit.name || 'Produit sans nom',
          categorie: produit.categorie || produit.category || 'Non classe',
          prix: produit.prix || produit.price || 0,
          quantite: produit.quantite || produit.quantity || produit.stock || 0,
          unite: produit.unite || produit.unit || 'kg',
          description: produit.description || produit.desc || '',
          imageUrl: produit.imageUrl || produit.image || '',
          statut: getStatutProduit(produit),
          dateAjout: produit.createdAt || produit.dateAjout || 'Date inconnue'
        }))
      );
    } catch (err) {
      let errorMessage = err.message || 'Erreur lors du chargement des produits';

      if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
        errorMessage = 'Impossible de se connecter au serveur. Verifiez votre connexion Internet.';
      } else if (err.message.includes('401') || err.message.includes('token')) {
        errorMessage = 'Session expiree. Veuillez vous reconnecter.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.message.includes('404')) {
        errorMessage = "Endpoint non trouve. Verifiez l'URL de l'API.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSupprimerProduit = async (produitId) => {
    if (!window.confirm('Etes-vous sur de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/products/${produitId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      setProduits((prev) => prev.filter((produit) => produit.id !== produitId));
      alert('Produit supprime avec succes.');
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchMesProduits();
  }, [fetchMesProduits]);

  const formatPrix = (prix) => `${Number(prix).toLocaleString('fr-FR')} FCFA`;

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const getStatutClass = (statut) => {
    switch (statut) {
      case 'Disponible': return 'statut-disponible';
      case 'Bientot epuise': return 'statut-bientot-epuise';
      case 'Epuise': return 'statut-epuise';
      default: return 'statut-default';
    }
  };

  const getDefaultEmoji = (nom) => {
    const nomLower = nom.toLowerCase();
    if (nomLower.includes('tomate')) return '🍅';
    if (nomLower.includes('pomme')) return '🍎';
    if (nomLower.includes('carotte')) return '🥕';
    if (nomLower.includes('salade') || nomLower.includes('laitue')) return '🥬';
    if (nomLower.includes('oignon')) return '🧅';
    if (nomLower.includes('ail')) return '🧄';
    if (nomLower.includes('poivron')) return '🫑';
    if (nomLower.includes('brocoli')) return '🥦';
    if (nomLower.includes('mais')) return '🌽';
    if (nomLower.includes('aubergine')) return '🍆';
    if (nomLower.includes('fruit')) return '🍓';
    if (nomLower.includes('legume')) return '🥦';
    return '📦';
  };

  const ProductImage = ({ src, alt, nom }) => {
    const [imageSrc, setImageSrc] = useState(getDefaultEmoji(nom));

    useEffect(() => {
      if (!src) {
        setImageSrc(getDefaultEmoji(nom));
        return;
      }

      const finalUrl = buildUploadUrl(src);
      const image = new Image();
      image.onload = () => setImageSrc(finalUrl);
      image.onerror = () => setImageSrc(getDefaultEmoji(nom));
      image.src = finalUrl;
    }, [nom, src]);

    if (imageSrc.startsWith('http') || imageSrc.startsWith('/')) {
      return (
        <img
          src={imageSrc}
          alt={alt}
          className="produit-image-reel"
          onError={() => setImageSrc(getDefaultEmoji(nom))}
        />
      );
    }

    return <div className="produit-emoji">{imageSrc}</div>;
  };

  if (loading) {
    return (
      <div className="produits-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement de vos produits...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="produits-container">
        <div className="error-container">
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchMesProduits} className="btn-primary">
              Reessayer
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="produits-container">
      <div className="produits-header">
        <h1>Mes Produits</h1>
        <Link to="/ajouter-produit" className="btn-ajouter">
          <span className="btn-icon">+</span>
          Ajouter un produit
        </Link>
      </div>

      <div className="produits-stats">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>{produits.length}</h3>
            <p>Produits total</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{produits.filter((produit) => produit.statut === 'Disponible').length}</h3>
            <p>Disponibles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{produits.filter((produit) => produit.statut === 'Bientot epuise').length}</h3>
            <p>Bientot epuises</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <h3>{produits.filter((produit) => produit.statut === 'Epuise').length}</h3>
            <p>Epuises</p>
          </div>
        </div>
      </div>

      <div className="produits-grid">
        {produits.map((produit) => (
          <div key={produit.id} className="produit-card">
            <div className="produit-header">
              <ProductImage src={produit.imageUrl} alt={produit.nom} nom={produit.nom} />
              <div className="produit-titre">
                <h3>{produit.nom}</h3>
                <span className="produit-categorie">{produit.categorie}</span>
              </div>
            </div>

            {produit.description && (
              <div className="produit-description">
                <p>{produit.description}</p>
              </div>
            )}

            <div className="produit-info">
              <div className="info-row">
                <span className="info-label">Prix:</span>
                <span className="info-value prix">{formatPrix(produit.prix)}/{produit.unite}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Quantite:</span>
                <span className="info-value">{produit.quantite} {produit.unite}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Statut:</span>
                <span className={`info-value ${getStatutClass(produit.statut)}`}>
                  {produit.statut}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Ajoute le:</span>
                <span className="info-value date">{formatDate(produit.dateAjout)}</span>
              </div>
            </div>

            <div className="produit-actions">
              <button className="btn-modifier" onClick={() => navigate(`/modifier-produit/${produit.id}`)}>
                <span className="btn-icon">✏️</span>
                Modifier
              </button>
              <button className="btn-supprimer" onClick={() => handleSupprimerProduit(produit.id)}>
                <span className="btn-icon">🗑️</span>
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {produits.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>Aucun produit trouve</h3>
          <p>Commencez par ajouter votre premier produit</p>
          <Link to="/ajouter-produit" className="btn-primary">
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  );
};

export default MesProduits;
