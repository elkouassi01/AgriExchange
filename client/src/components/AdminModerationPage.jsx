import React, { useCallback, useEffect, useState } from 'react';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import './AdminModerationPage.css';

const STATUS_LABELS = {
  pending:  { label: 'En attente', cls: 'mod-badge--pending' },
  approved: { label: 'Approuvé',   cls: 'mod-badge--approved' },
  rejected: { label: 'Rejeté',     cls: 'mod-badge--rejected' },
};

const ETATS  = ['frais', 'sec', 'transforme', 'congele', 'bio'];
const UNITES = ['kg', 'g', 'tonne', 'litre', 'cl', 'tête', 'unité', 'sac', 'paquet', 'botte', 'carton'];

// ── Helper : aplatit le nom de chaque catégorie depuis l'arbre ─────────────────
const flattenCatValues = (nodes, result = []) => {
  for (const n of nodes) {
    if (n.categorieValue) result.push(n.categorieValue);
    if (n.children?.length) flattenCatValues(n.children, result);
  }
  return [...new Set(result)];
};

// ── Modal d'édition ────────────────────────────────────────────────────────────
const EditModal = ({ product, catValues, onClose, onSaved, onApprove, onReject }) => {
  const [form, setForm] = useState({
    nom:          product.nom          || '',
    description:  product.description  || '',
    prix:         product.prix         ?? '',
    categorie:    product.categorie    || '',
    stock:        product.stock        ?? '',
    unite:        product.unite        || 'kg',
    etat:         product.etat         || '',
    mensurations: product.mensurations || '',
  });
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectNote, setShowRejectNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const saveOnly = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/moderation/${product.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSaving(false);
    }
  };

  const saveAndApprove = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/moderation/${product.id}`, form);
      await onApprove({ ...product, ...form });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSaving(false);
    }
  };

  const saveAndReject = async () => {
    if (!showRejectNote) { setShowRejectNote(true); return; }
    setSaving(true);
    setError('');
    try {
      await api.put(`/moderation/${product.id}`, form);
      await onReject({ ...product, ...form }, rejectNote);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSaving(false);
    }
  };

  return (
    <div className="mod-overlay" onClick={onClose}>
      <div className="mod-edit-modal" onClick={(e) => e.stopPropagation()}>

        {/* En-tête */}
        <div className="mod-edit-modal__header">
          <div>
            <h2 className="mod-edit-modal__title">✏️ Modifier la denrée</h2>
            <p className="mod-edit-modal__sub">Agriculteur : {product.seller?.nom || product.seller_nom}</p>
          </div>
          <button className="mod-edit-modal__close" onClick={onClose}>×</button>
        </div>

        {/* Formulaire */}
        <div className="mod-edit-modal__body">
          <div className="mod-edit-grid">

            <div className="mod-edit-field mod-edit-field--full">
              <label>Nom de la denrée</label>
              <input value={form.nom} onChange={(e) => set('nom', e.target.value)} />
            </div>

            <div className="mod-edit-field mod-edit-field--full">
              <label>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            <div className="mod-edit-field">
              <label>Prix (FCFA)</label>
              <input
                type="number"
                min="0"
                value={form.prix}
                onChange={(e) => set('prix', e.target.value)}
              />
            </div>

            <div className="mod-edit-field">
              <label>Stock</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
              />
            </div>

            <div className="mod-edit-field">
              <label>Unité</label>
              <select value={form.unite} onChange={(e) => set('unite', e.target.value)}>
                {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                {!UNITES.includes(form.unite) && form.unite && (
                  <option value={form.unite}>{form.unite}</option>
                )}
              </select>
            </div>

            <div className="mod-edit-field">
              <label>Catégorie</label>
              {catValues.length > 0 ? (
                <select value={form.categorie} onChange={(e) => set('categorie', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {catValues.map((c) => <option key={c} value={c}>{c}</option>)}
                  {!catValues.includes(form.categorie) && form.categorie && (
                    <option value={form.categorie}>{form.categorie}</option>
                  )}
                </select>
              ) : (
                <input value={form.categorie} onChange={(e) => set('categorie', e.target.value)} />
              )}
            </div>

            <div className="mod-edit-field">
              <label>État</label>
              <select value={form.etat} onChange={(e) => set('etat', e.target.value)}>
                <option value="">— Non précisé —</option>
                {ETATS.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="mod-edit-field mod-edit-field--full">
              <label>Mensurations / Conditionnement <span className="mod-edit-opt">(optionnel)</span></label>
              <input
                value={form.mensurations}
                onChange={(e) => set('mensurations', e.target.value)}
                placeholder="ex : sachet de 5 kg, boîte de 12"
              />
            </div>
          </div>

          {/* Zone motif rejet (dépliable) */}
          {showRejectNote && (
            <div className="mod-edit-reject-zone">
              <label className="mod-modal__label">Motif du rejet <span className="mod-edit-opt">(optionnel)</span></label>
              <textarea
                className="mod-modal__textarea"
                rows={3}
                placeholder="Ex : image floue, prix incohérent…"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
              <p className="mod-modal__hint">Ce motif sera transmis à l'agriculteur.</p>
            </div>
          )}

          {error && <p className="mod-edit-error">{error}</p>}
        </div>

        {/* Actions */}
        <div className="mod-edit-modal__footer">
          <button className="mod-btn mod-btn--cancel" onClick={onClose} disabled={saving}>
            Annuler
          </button>
          <button className="mod-btn mod-btn--save" onClick={saveOnly} disabled={saving}>
            {saving ? '…' : '💾 Enregistrer'}
          </button>
          <button className="mod-btn mod-btn--approve" onClick={saveAndApprove} disabled={saving}>
            {saving ? '…' : '✅ Enreg. + Approuver'}
          </button>
          <button className="mod-btn mod-btn--reject" onClick={saveAndReject} disabled={saving}>
            {saving ? '…' : showRejectNote ? '❌ Confirmer le rejet' : '❌ Enreg. + Rejeter'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ────────────────────────────────────────────────────────────
export default function AdminModerationPage() {
  const [tab, setTab]           = useState('pending');
  const [products, setProducts] = useState([]);
  const [stats, setStats]       = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [rejectModal, setRejectModal]   = useState(null);
  const [rejectNote, setRejectNote]     = useState('');
  const [editModal, setEditModal]       = useState(null);
  const [catValues, setCatValues]       = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Charger les valeurs de catégorie pour le sélecteur du modal
  useEffect(() => {
    api.get('/categories').then((res) => {
      setCatValues(flattenCatValues(res.data.data || []));
    }).catch(() => {});
  }, []);

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

  // Approval direct (sans édition préalable)
  const handleApprove = async (product) => {
    setActionLoading(product.id);
    try {
      await api.put(`/moderation/${product.id}/approve`);
      showToast(`✅ "${product.nom}" approuvé.`);
      fetchStats();
      fetchProducts();
    } catch (err) {
      showToast(`❌ Erreur : ${err.response?.data?.message || 'Erreur serveur'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Approval depuis le modal d'édition (appel direct sans showToast ici, géré par onSaved)
  const approveProduct = async (product) => {
    await api.put(`/moderation/${product.id}/approve`);
  };

  // Rejection depuis le modal d'édition
  const rejectProduct = async (product, note) => {
    await api.put(`/moderation/${product.id}/reject`, { note });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    try {
      await api.put(`/moderation/${rejectModal.id}/reject`, { note: rejectNote });
      showToast(`❌ "${rejectModal.nom}" rejeté.`);
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

  const handleEditSaved = () => {
    setEditModal(null);
    showToast('✅ Denrée mise à jour.');
    fetchStats();
    fetchProducts();
  };

  return (
    <div className="mod-page">

      {toast && <div className="mod-toast">{toast}</div>}

      {/* Header */}
      <div className="mod-header">
        <div className="mod-header__left">
          <h1 className="mod-title">🛡️ Modération des denrées</h1>
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
          📋 Toutes les denrées
        </button>
      </div>

      {/* Filtre statut */}
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
          <p>Aucune denrée {tab === 'pending' ? 'en attente' : 'trouvée'}.</p>
        </div>
      ) : (
        <div className="mod-list">
          {products.map((p) => {
            const status = p.moderationStatus || p.moderation_status || 'pending';
            return (
              <div key={p.id} className={`mod-card mod-card--${status}`}>

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
                    <span className={`mod-badge ${STATUS_LABELS[status]?.cls}`}>
                      {STATUS_LABELS[status]?.label}
                    </span>
                  </div>

                  <p className="mod-card__desc">{p.description || '—'}</p>

                  <div className="mod-card__meta">
                    <span>💰 {Number(p.prix).toLocaleString('fr-FR')} FCFA</span>
                    <span>📦 {p.stock} {p.unite}</span>
                    {p.etat && <span>🏷️ {p.etat}</span>}
                    <span>📅 {new Date(p.createdAt || p.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="mod-card__seller">
                    <span className="mod-card__seller-label">Agriculteur :</span>
                    <span className="mod-card__seller-name">
                      {p.seller?.nom || p.seller_nom} — {p.seller?.contact || p.seller_contact}
                    </span>
                  </div>

                  {p.moderation_note && (
                    <div className="mod-card__reject-note">
                      📝 Motif de rejet : <em>{p.moderation_note}</em>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mod-card__actions">
                  {/* Bouton modifier — toujours visible */}
                  <button
                    className="mod-btn mod-btn--edit"
                    onClick={() => setEditModal(p)}
                    disabled={actionLoading === p.id}
                  >
                    ✏️ Modifier
                  </button>

                  {status === 'pending' && (
                    <>
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
                    </>
                  )}

                  {status === 'rejected' && (
                    <button
                      className="mod-btn mod-btn--approve"
                      onClick={() => handleApprove(p)}
                      disabled={actionLoading === p.id}
                    >
                      {actionLoading === p.id ? '…' : '✅ Réapprouver'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal rejet simple */}
      {rejectModal && (
        <div className="mod-overlay" onClick={() => setRejectModal(null)}>
          <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="mod-modal__title">❌ Rejeter cette denrée</h2>
            <p className="mod-modal__product">«{rejectModal.nom}»</p>
            <label className="mod-modal__label">Motif du rejet (optionnel)</label>
            <textarea
              className="mod-modal__textarea"
              rows={4}
              placeholder="Ex : Image de mauvaise qualité, prix incohérent…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <p className="mod-modal__hint">Ce motif sera envoyé à l'agriculteur par WhatsApp.</p>
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

      {/* Modal édition */}
      {editModal && (
        <EditModal
          product={editModal}
          catValues={catValues}
          onClose={() => setEditModal(null)}
          onSaved={handleEditSaved}
          onApprove={approveProduct}
          onReject={rejectProduct}
        />
      )}
    </div>
  );
}
