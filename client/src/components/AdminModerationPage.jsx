import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import './AdminModerationPage.css';

const STATUS_LABELS = {
  pending:  { label: 'En attente', cls: 'mod-badge--pending' },
  approved: { label: 'Approuvé',   cls: 'mod-badge--approved' },
  rejected: { label: 'Rejeté',     cls: 'mod-badge--rejected' },
};

export default function AdminModerationPage() {
  const [tab, setTab]           = useState('pending'); // pending | all
  const [products, setProducts] = useState([]);
  const [stats, setStats]       = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [rejectModal, setRejectModal]   = useState(null); // product à rejeter
  const [rejectNote, setRejectNote]     = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/moderation/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch {}
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = tab === 'pending'
        ? '/moderation/pending'
        : `/moderation/all${filterStatus ? `?status=${filterStatus}` : ''}`;
      const res = await api.get(url);
      setProducts(res.data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filterStatus]);

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, [fetchStats, fetchProducts]);

  const handleApprove = async (product) => {
    setActionLoading(product.id);
    try {
      await api.put(`/moderation/${product.id}/approve`);
      showToast(`✅ "${product.nom}" approuvé — l'agriculteur a été notifié par WhatsApp.`);
      fetchStats();
      fetchProducts();
    } catch (err) {
      showToast(`❌ Erreur : ${err.response?.data?.message || 'Erreur serveur'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.put(`/moderation/${rejectModal.id}/reject`, { note: rejectNote });
      showToast(`❌ "${rejectModal.nom}" rejeté — l'agriculteur a été notifié par WhatsApp.`);
      setRejectModal(null);
      setRejectNote('');
      fetchStats();
      fetchProducts();
    } catch (err) {
      showToast(`Erreur : ${err.response?.data?.message || 'Erreur serveur'}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mod-page">

      {toast && <div className="mod-toast">{toast}</div>}

      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <h1 className="mod-title">🛡️ Modération des produits</h1>
          <p className="mod-sub">Contrôlez toutes les publications avant leur mise en ligne</p>
        </div>
        <div className="mod-stats-row">
          <div className="mod-stat mod-stat--pending">
            <span className="mod-stat__num">{stats.pending}</span>
            <span className="mod-stat__label">En attente</span>
          </div>
          <div className="mod-stat mod-stat--approved">
            <span className="mod-stat__num">{stats.approved}</span>
            <span className="mod-stat__label">Approuvés</span>
          </div>
          <div className="mod-stat mod-stat--rejected">
            <span className="mod-stat__num">{stats.rejected}</span>
            <span className="mod-stat__label">Rejetés</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mod-tabs">
        <button
          className={`mod-tab ${tab === 'pending' ? 'mod-tab--active' : ''}`}
          onClick={() => setTab('pending')}
        >
          ⏳ En attente
          {stats.pending > 0 && <span className="mod-tab__badge">{stats.pending}</span>}
        </button>
        <button
          className={`mod-tab ${tab === 'all' ? 'mod-tab--active' : ''}`}
          onClick={() => setTab('all')}
        >
          📋 Tous les produits
        </button>
      </div>

      {/* Filtre statut (onglet "all" uniquement) */}
      {tab === 'all' && (
        <div className="mod-filter-row">
          <select
            className="mod-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvés</option>
            <option value="rejected">Rejetés</option>
          </select>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="mod-loading">
          <div className="mod-spinner" />
          <p>Chargement…</p>
        </div>
      ) : products.length === 0 ? (
        <div className="mod-empty">
          <div className="mod-empty__icon">✅</div>
          <p>Aucun produit {tab === 'pending' ? 'en attente' : 'trouvé'}.</p>
        </div>
      ) : (
        <div className="mod-list">
          {products.map((p) => (
            <div key={p.id} className={`mod-card mod-card--${p.moderationStatus || p.moderation_status || 'pending'}`}>

              {/* Image */}
              <div className="mod-card__img-wrap">
                {p.imageUrl || p.image_url ? (
                  <img
                    src={buildUploadUrl(p.imageUrl || p.image_url)}
                    alt={p.nom}
                    className="mod-card__img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="mod-card__img-placeholder">📦</div>
                )}
              </div>

              {/* Infos */}
              <div className="mod-card__body">
                <div className="mod-card__top">
                  <div>
                    <h3 className="mod-card__name">{p.nom}</h3>
                    <span className="mod-card__cat">{p.categorie}</span>
                  </div>
                  <span className={`mod-badge ${STATUS_LABELS[p.moderationStatus || p.moderation_status || 'pending']?.cls}`}>
                    {STATUS_LABELS[p.moderationStatus || p.moderation_status || 'pending']?.label}
                  </span>
                </div>

                <p className="mod-card__desc">{p.description || '—'}</p>

                <div className="mod-card__meta">
                  <span>💰 {Number(p.prix).toLocaleString('fr-FR')} FCFA</span>
                  <span>📦 {p.stock} {p.unite}</span>
                  <span>🏷️ {p.etat}</span>
                  <span>📅 {new Date(p.createdAt || p.created_at).toLocaleDateString('fr-FR')}</span>
                </div>

                {/* Vendeur */}
                <div className="mod-card__seller">
                  <span className="mod-card__seller-label">Agriculteur :</span>
                  <span className="mod-card__seller-name">
                    {p.seller?.nom || p.seller_nom} — {p.seller?.contact || p.seller_contact}
                  </span>
                </div>

                {/* Note de rejet */}
                {(p.moderation_note) && (
                  <div className="mod-card__reject-note">
                    📝 Motif de rejet : <em>{p.moderation_note}</em>
                  </div>
                )}
              </div>

              {/* Actions */}
              {(p.moderationStatus || p.moderation_status) === 'pending' && (
                <div className="mod-card__actions">
                  <button
                    className="mod-btn mod-btn--approve"
                    onClick={() => handleApprove(p)}
                    disabled={actionLoading === p.id}
                  >
                    {actionLoading === p.id ? '…' : '✅ Approuver'}
                  </button>
                  <button
                    className="mod-btn mod-btn--reject"
                    onClick={() => { setRejectModal(p); setRejectNote(''); }}
                    disabled={actionLoading === p.id}
                  >
                    ❌ Rejeter
                  </button>
                </div>
              )}

              {(p.moderationStatus || p.moderation_status) === 'rejected' && (
                <div className="mod-card__actions">
                  <button
                    className="mod-btn mod-btn--approve"
                    onClick={() => handleApprove(p)}
                    disabled={actionLoading === p.id}
                  >
                    {actionLoading === p.id ? '…' : '✅ Réapprouver'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal rejet */}
      {rejectModal && (
        <div className="mod-overlay" onClick={() => setRejectModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="mod-modal__title">❌ Rejeter ce produit</h2>
            <p className="mod-modal__product">«{rejectModal.nom}»</p>
            <label className="mod-modal__label">Motif du rejet (optionnel)</label>
            <textarea
              className="mod-modal__textarea"
              rows={4}
              placeholder="Ex : Image de mauvaise qualité, prix incohérent, description manquante…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <p className="mod-modal__hint">
              Ce motif sera envoyé à l'agriculteur par WhatsApp.
            </p>
            <div className="mod-modal__actions">
              <button
                className="mod-btn mod-btn--reject"
                onClick={handleRejectConfirm}
                disabled={actionLoading === rejectModal.id}
              >
                {actionLoading === rejectModal.id ? 'Envoi…' : '❌ Confirmer le rejet'}
              </button>
              <button className="mod-btn mod-btn--cancel" onClick={() => setRejectModal(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
