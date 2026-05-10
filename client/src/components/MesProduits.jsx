import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './MesProduits.css';
import { buildUploadUrl } from '../config/api';
import api from '../services/axiosConfig';
import SponsorPayModal from './SponsorPayModal';

const MesProduits = () => {
  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modal paiement sponsoring
  const [sponsorPayProduct, setSponsorPayProduct] = useState(null);

  // Retour CinetPay après paiement sponsoring
  const [sponsorCheckMsg, setSponsorCheckMsg] = useState('');

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

      const res = await api.get('/products/my-products');
      const data = res.data;

      let produitsData = [];
      if (Array.isArray(data)) produitsData = data;
      else if (Array.isArray(data.products)) produitsData = data.products;
      else if (data.success && Array.isArray(data.data?.products)) produitsData = data.data.products;
      else if (data.success && Array.isArray(data.data)) produitsData = data.data;
      else if (Array.isArray(data.data)) produitsData = data.data;

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
          dateAjout: produit.createdAt || produit.dateAjout || 'Date inconnue',
          isFeatured: Boolean(produit.isFeatured || produit.is_featured),
          moderationStatus: produit.moderationStatus || produit.moderation_status || 'approved',
          moderationNote: produit.moderationNote || produit.moderation_note || null,
        }))
      );
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur lors du chargement des produits');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const [sponsorLoading, setSponsorLoading] = useState(null); // produitId en cours
  const [sponsorError, setSponsorError] = useState('');

  const handleToggleSponsor = async (produit) => {
    setSponsorLoading(produit.id);
    setSponsorError('');
    try {
      const activate = !produit.isFeatured;
      await api.put(`/products/${produit.id}/sponsor`, { activate });
      setProduits((prev) =>
        prev.map((p) => (p.id === produit.id ? { ...p, isFeatured: activate } : p))
      );
    } catch (err) {
      const data = err.response?.data;
      // Limite gratuite atteinte → proposer le paiement
      if (data?.limitReached && data?.paymentAvailable) {
        setSponsorPayProduct(produit);
      } else {
        setSponsorError(data?.message || 'Erreur lors de la mise à jour.');
      }
    } finally {
      setSponsorLoading(null);
    }
  };

  const handleSupprimerProduit = async (produitId) => {
    if (!window.confirm('Etes-vous sur de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      await api.delete(`/products/${produitId}`);
      setProduits((prev) => prev.filter((produit) => produit.id !== produitId));
      alert('Produit supprime avec succes.');
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err.response?.data?.message || err.message}`);
    }
  };

  useEffect(() => {
    fetchMesProduits();
  }, [fetchMesProduits]);

  // Retour de CinetPay après paiement sponsoring
  useEffect(() => {
    const txId  = searchParams.get('sponsor_tx');
    const pid   = searchParams.get('sponsor_pid');
    if (!txId || !pid) return;

    // Nettoyer l'URL immédiatement
    setSearchParams({}, { replace: true });
    setSponsorCheckMsg('Vérification du paiement…');

    api.get(`/products/${pid}/sponsor/check?tx_id=${txId}`)
      .then((res) => {
        if (res.data.paid) {
          const until = res.data.endDate
            ? new Date(res.data.endDate).toLocaleDateString('fr-FR')
            : '';
          setSponsorCheckMsg(`✅ Sponsoring activé${until ? ` jusqu'au ${until}` : ''} !`);
          // Rafraîchir la liste pour refléter is_featured
          fetchMesProduits();
        } else {
          setSponsorCheckMsg('⚠️ Paiement non confirmé. Réessayez dans quelques instants.');
        }
      })
      .catch(() => setSponsorCheckMsg('⚠️ Erreur lors de la vérification du paiement.'));
  }, [searchParams, setSearchParams, fetchMesProduits]);

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

      {sponsorCheckMsg && (
        <div className={`sponsor-check-banner ${sponsorCheckMsg.startsWith('✅') ? 'sponsor-check-banner--ok' : 'sponsor-check-banner--warn'}`}>
          {sponsorCheckMsg}
          <button onClick={() => setSponsorCheckMsg('')}>×</button>
        </div>
      )}

      {sponsorError && (
        <div className="sponsor-error-banner">
          ⚠️ {sponsorError}
          <button onClick={() => setSponsorError('')}>×</button>
        </div>
      )}

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
          <div key={produit.id} className={`produit-card${produit.isFeatured ? ' produit-card--sponsored' : ''}`}>
            <div className="produit-header">
              <div className="produit-img-wrap">
                <ProductImage src={produit.imageUrl} alt={produit.nom} nom={produit.nom} />
                {produit.isFeatured && <span className="produit-sponsored-badge">⭐ Sponsorisé</span>}
                {produit.moderationStatus === 'pending' && (
                  <span className="produit-moderation-badge produit-moderation-badge--pending">⏳ En attente</span>
                )}
                {produit.moderationStatus === 'rejected' && (
                  <span className="produit-moderation-badge produit-moderation-badge--rejected">❌ Refusé</span>
                )}
              </div>
              <div className="produit-titre">
                <h3>{produit.nom}</h3>
                <span className="produit-categorie">{produit.categorie}</span>
              </div>
            </div>

            {produit.moderationStatus === 'rejected' && produit.moderationNote && (
              <div className="produit-rejection-note">
                📝 Motif de refus : <em>{produit.moderationNote}</em>
              </div>
            )}

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
              <button
                className={`btn-sponsor ${produit.isFeatured ? 'btn-sponsor--active' : ''}`}
                onClick={() => handleToggleSponsor(produit)}
                disabled={sponsorLoading === produit.id}
                title={produit.isFeatured ? 'Retirer de la sponsorisation' : 'Sponsoriser ce produit'}
              >
                {sponsorLoading === produit.id
                  ? '…'
                  : produit.isFeatured
                    ? '⭐ Sponsorisé'
                    : '☆ Sponsoriser'}
              </button>
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

      {/* Modal paiement sponsoring */}
      {sponsorPayProduct && (
        <SponsorPayModal
          product={sponsorPayProduct}
          onClose={() => setSponsorPayProduct(null)}
        />
      )}
    </div>
  );
};

export default MesProduits;
