import { useState } from 'react';
import api from '../services/axiosConfig';
import './SponsorPayModal.css';

export default function SponsorPayModal({ product, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/products/${product.id}/sponsor/initiate`);
      if (res.data.success && res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        setError(res.data.message || 'Erreur lors de l\'initialisation du paiement');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="spm-overlay" onClick={onClose}>
      <div className="spm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="spm-header">
          <div className="spm-header__icon">⭐</div>
          <div>
            <h2 className="spm-title">Sponsoriser cette denrée</h2>
            <p className="spm-sub">Limite gratuite atteinte — passez au sponsoring payant</p>
          </div>
          <button className="spm-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Produit */}
        <div className="spm-product">
          <span className="spm-product__label">Denrée</span>
          <span className="spm-product__name">{product.nom}</span>
        </div>

        {/* Offre */}
        <div className="spm-offer">
          <div className="spm-offer__price">
            <span className="spm-offer__amount">5 000</span>
            <span className="spm-offer__currency">FCFA</span>
          </div>
          <div className="spm-offer__details">
            <p className="spm-offer__duration">⏱ 14 jours de visibilité</p>
            <p className="spm-offer__desc">Votre denrée sera mise en avant sur la page d'accueil et en tête de liste dans sa catégorie.</p>
          </div>
        </div>

        {/* Avantages */}
        <ul className="spm-benefits">
          <li>✅ Affichage prioritaire sur la page d'accueil</li>
          <li>✅ Badge doré "Sponsorisé" sur la fiche denrée</li>
          <li>✅ Activation immédiate après paiement</li>
          <li>✅ Expiration automatique après 14 jours</li>
        </ul>

        {error && <p className="spm-error">{error}</p>}

        {/* Actions */}
        <div className="spm-actions">
          <button className="spm-btn spm-btn--pay" onClick={handlePay} disabled={loading}>
            {loading ? 'Redirection…' : '💳 Payer 5 000 FCFA — CinetPay'}
          </button>
          <button className="spm-btn spm-btn--cancel" onClick={onClose} disabled={loading}>
            Annuler
          </button>
        </div>

        <p className="spm-note">
          Paiement sécurisé via CinetPay · Mobile Money, carte bancaire acceptés
        </p>
      </div>
    </div>
  );
}
