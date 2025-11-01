import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './MesProduits.css';

const MesProduits = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Configuration de l'API
  const SERVER_BASE_URL = window.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  // Fonction pour récupérer les produits depuis l'API
  const fetchMesProduits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Chargement des produits depuis:', `${SERVER_BASE_URL}/api/v1/products/my-products`);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Vous devez être connecté pour voir vos produits');
      }

      const response = await fetch(`${SERVER_BASE_URL}/api/v1/products/my-products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('📦 Réponse API mes produits:', data);

      if (!response.ok) {
        throw new Error(data.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      // Traitement des différents formats de réponse
      let produitsData = [];
      
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
      else if (data.data && Array.isArray(data.data)) {
        produitsData = data.data;
      }
      else {
        throw new Error("Format de réponse inattendu de l'API");
      }

      // Formater les produits pour l'affichage
      const produitsFormattes = produitsData.map(produit => ({
        id: produit._id || produit.id,
        nom: produit.nom || produit.name || 'Produit sans nom',
        categorie: produit.categorie || produit.category || 'Non classé',
        prix: produit.prix || produit.price || 0,
        quantite: produit.quantite || produit.quantity || produit.stock || 0,
        unite: produit.unite || produit.unit || 'kg',
        description: produit.description || produit.desc || '',
        imageUrl: produit.imageUrl || produit.image || '',
        statut: getStatutProduit(produit),
        dateAjout: produit.createdAt || produit.dateAjout || 'Date inconnue'
      }));

      setProduits(produitsFormattes);

    } catch (err) {
      console.error('❌ Erreur chargement produits:', err);
      
      let errorMessage = err.message || 'Erreur lors du chargement des produits';
      
      if (err.message.includes('Failed to fetch') || err.message.includes('Network Error')) {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion Internet.";
      }
      else if (err.message.includes('401') || err.message.includes('token')) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
        // Redirection vers la page de connexion après 2 secondes
        setTimeout(() => navigate('/login'), 2000);
      }
      else if (err.message.includes('404')) {
        errorMessage = "Endpoint non trouvé. Vérifiez l'URL de l'API.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer le statut du produit basé sur la quantité
  const getStatutProduit = (produit) => {
    const quantite = produit.quantite || produit.quantity || produit.stock || 0;
    
    if (quantite === 0) {
      return 'Épuisé';
    } else if (quantite <= 10) {
      return 'Bientôt épuisé';
    } else {
      return 'Disponible';
    }
  };

  // Fonction pour supprimer un produit
  const handleSupprimerProduit = async (produitId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/products/${produitId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression');
      }

      // Mettre à jour la liste des produits
      setProduits(prev => prev.filter(p => p.id !== produitId));
      
      alert('Produit supprimé avec succès!');

    } catch (err) {
      console.error('❌ Erreur suppression produit:', err);
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  // Fonction pour formater le prix
  const formatPrix = (prix) => {
    return `${Number(prix).toLocaleString('fr-FR')} FCFA`;
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const getStatutClass = (statut) => {
    switch(statut) {
      case 'Disponible': return 'statut-disponible';
      case 'Bientôt épuisé': return 'statut-bientot-epuise';
      case 'Épuisé': return 'statut-epuise';
      default: return 'statut-default';
    }
  };

  // Composant pour l'image du produit
  const ProductImage = ({ src, alt, nom }) => {
    const [imageSrc, setImageSrc] = useState(getDefaultEmoji(nom));
    const DEFAULT_IMAGE = '📦';

    useEffect(() => {
      if (!src) {
        setImageSrc(getDefaultEmoji(nom));
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

      // Tester si l'image existe
      const img = new Image();
      img.onload = () => setImageSrc(finalUrl);
      img.onerror = () => setImageSrc(getDefaultEmoji(nom));
      img.src = finalUrl;
    }, [src, nom]);

    if (imageSrc.startsWith('http')) {
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

  // Fonction pour obtenir un emoji par défaut basé sur le nom du produit
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
    if (nomLower.includes('maïs')) return '🌽';
    if (nomLower.includes('aubergine')) return '🍆';
    if (nomLower.includes('fruit')) return '🍓';
    if (nomLower.includes('légume')) return '🥦';
    return '📦';
  };

  useEffect(() => {
    fetchMesProduits();
  }, []);

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
          <h3>🚫 Erreur de chargement</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchMesProduits} className="btn-primary">
              ↻ Réessayer
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              🏠 Accueil
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
            <h3>{produits.filter(p => p.statut === 'Disponible').length}</h3>
            <p>Disponibles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <h3>{produits.filter(p => p.statut === 'Bientôt épuisé').length}</h3>
            <p>Bientôt épuisés</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <h3>{produits.filter(p => p.statut === 'Épuisé').length}</h3>
            <p>Épuisés</p>
          </div>
        </div>
      </div>

      <div className="produits-grid">
        {produits.map(produit => (
          <div key={produit.id} className="produit-card">
            <div className="produit-header">
              <ProductImage 
                src={produit.imageUrl} 
                alt={produit.nom}
                nom={produit.nom}
              />
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
                <span className="info-label">Quantité:</span>
                <span className="info-value">{produit.quantite} {produit.unite}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Statut:</span>
                <span className={`info-value ${getStatutClass(produit.statut)}`}>
                  {produit.statut}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Ajouté le:</span>
                <span className="info-value date">{formatDate(produit.dateAjout)}</span>
              </div>
            </div>

            <div className="produit-actions">
              <button 
                className="btn-modifier"
                onClick={() => navigate(`/modifier-produit/${produit.id}`)}
              >
                <span className="btn-icon">✏️</span>
                Modifier
              </button>
              <button 
                className="btn-supprimer"
                onClick={() => handleSupprimerProduit(produit.id)}
              >
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
          <h3>Aucun produit trouvé</h3>
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