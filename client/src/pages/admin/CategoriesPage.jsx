import React, { useState, useEffect, useCallback } from 'react';
import './CategoriesPage.css';
import api from '../../services/axiosConfig';

// ── Utilitaires ───────────────────────────────────────────────────────────────

const toSlug = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim();

// Aplatit l'arbre pour le <select> du parent (avec profondeur pour l'indentation)
const flattenForSelect = (nodes, depth = 0, result = []) => {
  for (const node of nodes) {
    result.push({ id: node.id, nom: node.nom, depth });
    if (node.children?.length) flattenForSelect(node.children, depth + 1, result);
  }
  return result;
};

// ── Formulaire modal ──────────────────────────────────────────────────────────

const EMPTY_FORM = { nom: '', slug: '', categorieValue: '', parentId: null, ordre: 0, actif: true };

const CategoryModal = ({ initial, tree, onSave, onClose }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(initial?.id);
  // Toutes les catégories sauf celle en cours d'édition (pour éviter la circularité)
  const parentOptions = flattenForSelect(tree).filter((c) => c.id !== initial?.id);

  const set = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'nom' && !isEdit) next.slug = toSlug(value);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        nom: form.nom.trim(),
        slug: form.slug.trim(),
        categorieValue: form.categorieValue?.trim() || null,
        parentId: form.parentId ? Number(form.parentId) : null,
        ordre: Number(form.ordre) || 0,
        actif: form.actif,
      };
      if (isEdit) {
        await api.put(`/categories/${initial.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cat-modal-overlay" onClick={onClose}>
      <div className="cat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cat-modal-header">
          <h3>{isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h3>
          <button className="cat-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="cat-form">
          <div className="cat-form-row">
            <label>Nom <span className="req">*</span></label>
            <input
              value={form.nom}
              onChange={(e) => set('nom', e.target.value)}
              placeholder="ex : Légumes"
              required
            />
          </div>

          <div className="cat-form-row">
            <label>Slug <span className="req">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="ex : legumes"
              required
            />
            <small>Identifiant URL unique, sans espaces ni accents</small>
          </div>

          <div className="cat-form-row">
            <label>Valeur denrée</label>
            <input
              value={form.categorieValue || ''}
              onChange={(e) => set('categorieValue', e.target.value)}
              placeholder="ex : légumes  (valeur dans products.categorie)"
            />
            <small>Laissez vide pour un groupe sans denrées propres</small>
          </div>

          <div className="cat-form-row">
            <label>Catégorie parente</label>
            <select
              value={form.parentId ?? ''}
              onChange={(e) => set('parentId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Aucune (racine) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {'　'.repeat(p.depth)}{p.depth > 0 ? '└ ' : ''}{p.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="cat-form-inline">
            <div className="cat-form-row">
              <label>Ordre</label>
              <input
                type="number"
                min="0"
                value={form.ordre}
                onChange={(e) => set('ordre', e.target.value)}
              />
            </div>
            <div className="cat-form-row cat-form-row--toggle">
              <label>Active</label>
              <button
                type="button"
                className={`cat-toggle ${form.actif ? 'cat-toggle--on' : ''}`}
                onClick={() => set('actif', !form.actif)}
              >
                {form.actif ? 'Oui' : 'Non'}
              </button>
            </div>
          </div>

          {error && <p className="cat-form-error">{error}</p>}

          <div className="cat-modal-actions">
            <button type="button" className="cat-btn cat-btn--ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="cat-btn cat-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Nœud récursif ─────────────────────────────────────────────────────────────

const CategoryNode = ({ cat, depth, onEdit, onAdd, onDelete, deleting }) => {
  const hasChildren = cat.children?.length > 0;
  const indent = depth * 1.25; // rem

  return (
    <div className="cat-node" style={{ marginLeft: depth > 0 ? `${indent}rem` : 0 }}>
      {/* Ligne de connexion visuelle pour les enfants */}
      <div className={`cat-node-row ${depth > 0 ? 'cat-node-row--child' : 'cat-node-row--root'}`}>
        <div className="cat-group-info">
          {depth > 0 && <span className="cat-depth-arrow">└</span>}
          <span className={`cat-badge ${cat.actif ? 'cat-badge--actif' : 'cat-badge--inactif'}`}>
            {cat.actif ? 'Actif' : 'Inactif'}
          </span>
          <span className="cat-group-nom">{cat.nom}</span>
          <span className="cat-group-slug">/{cat.slug}</span>
          {!cat.categorieValue && (
            <span className="cat-group-tag">groupe</span>
          )}
          {cat.categorieValue && (
            <span className="cat-value-tag">→ {cat.categorieValue}</span>
          )}
        </div>
        <div className="cat-group-actions">
          <button
            className="cat-btn cat-btn--sm cat-btn--ghost"
            onClick={() => onAdd({ ...EMPTY_FORM, parentId: cat.id })}
            title="Ajouter un enfant"
          >
            + Enfant
          </button>
          <button
            className="cat-btn cat-btn--sm cat-btn--outline"
            onClick={() => onEdit(cat)}
          >
            Modifier
          </button>
          <button
            className="cat-btn cat-btn--sm cat-btn--danger"
            onClick={() => onDelete(cat.id, cat.nom)}
            disabled={deleting === cat.id}
          >
            {deleting === cat.id ? '…' : 'Supprimer'}
          </button>
        </div>
      </div>

      {hasChildren && (
        <div className="cat-children-container">
          {cat.children.map((child) => (
            <CategoryNode
              key={child.id}
              cat={child}
              depth={depth + 1}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={onDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────────────────────

const CategoriesPage = () => {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/categories');
      setTree(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const handleSaved = () => {
    setModal(null);
    fetchTree();
    showToast('Catégorie enregistrée.');
  };

  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Supprimer « ${nom} » ?\n\nSes enfants directs seront déplacés à la racine.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/categories/${id}`);
      fetchTree();
      showToast('Catégorie supprimée.');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="cat-page">
      {toast && <div className="cat-toast">{toast}</div>}

      <div className="cat-page-header">
        <div>
          <h1 className="cat-page-title">Catégories</h1>
          <p className="cat-page-sub">
            Gérez les groupes et sous-catégories affichés dans la page Étals — profondeur illimitée
          </p>
        </div>
        <button
          className="cat-btn cat-btn--primary"
          onClick={() => setModal({ initial: null })}
        >
          + Nouvelle catégorie
        </button>
      </div>

      {loading ? (
        <div className="cat-loading">
          <div className="cat-spinner" />
          <span>Chargement…</span>
        </div>
      ) : error ? (
        <div className="cat-error">{error}</div>
      ) : (
        <div className="cat-tree-list">
          {tree.length === 0 ? (
            <p className="cat-empty">Aucune catégorie. Créez-en une.</p>
          ) : (
            tree.map((root) => (
              <div key={root.id} className="cat-root-block">
                <CategoryNode
                  cat={root}
                  depth={0}
                  onEdit={(cat) => setModal({ initial: cat })}
                  onAdd={(initial) => setModal({ initial })}
                  onDelete={handleDelete}
                  deleting={deleting}
                />
              </div>
            ))
          )}
        </div>
      )}

      {modal && (
        <CategoryModal
          initial={modal.initial}
          tree={tree}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
