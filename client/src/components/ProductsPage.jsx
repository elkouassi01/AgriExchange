import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ProductsPage.css';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, buildUploadUrl } from '../config/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

// Trouve un nœud par id dans un arbre de profondeur quelconque
const findNode = (id, nodes) => {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNode(id, n.children);
      if (found) return found;
    }
  }
  return null;
};

// Collecte récursivement toutes les valeurs categorie d'un nœud et ses descendants
const collectValues = (node) => {
  const vals = node.categorieValue ? [node.categorieValue] : [];
  for (const child of node.children || []) vals.push(...collectValues(child));
  return vals;
};

const getCategoriesForId = (id, tree) => {
  if (!id || !tree.length) return null;
  const node = findNode(id, tree);
  if (!node) return null;
  const vals = collectValues(node);
  return vals.length > 0 ? vals : null;
};

const getLabelForId = (id, tree) => {
  if (!id) return 'Tous les étals';
  const node = findNode(id, tree);
  return node ? node.nom : '';
};

// Composant récursif pour un nœud de l'arbre (sidebar)
const TreeNode = ({ node, depth, selectedId, openGroups, onSelect, onToggle }) => {
  const activeChildren = (node.children || []).filter((c) => c.actif);
  const hasChildren = activeChildren.length > 0;
  const isActive = selectedId === node.id;
  // Profondeur 0 = style groupe, profondeur 1+ = style enfant avec indentation progressive
  const extraPad = depth > 1 ? { paddingLeft: `${1.75 + (depth - 1) * 0.9}rem` } : {};

  if (depth === 0) {
    return (
      <li className="tree-group">
        <div
          className={`tree-group-header${isActive ? ' active' : ''}`}
          onClick={() => onSelect(node.id)}
        >
          <span>{node.nom}</span>
          {hasChildren && (
            <button className="tree-arrow-btn" onClick={(e) => onToggle(node.id, e)}>
              {openGroups[node.id] ? '▾' : '▸'}
            </button>
          )}
        </div>
        {hasChildren && openGroups[node.id] && (
          <ul className="tree-children">
            {activeChildren.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={1}
                selectedId={selectedId}
                openGroups={openGroups}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // depth >= 1
  const subChildren = activeChildren;
  return (
    <>
      <li
        className={`tree-child${isActive ? ' active' : ''}`}
        style={extraPad}
        onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      >
        <span style={{ flex: 1 }}>{node.nom}</span>
        {hasChildren && (
          <button className="tree-arrow-btn" onClick={(e) => onToggle(node.id, e)}>
            {openGroups[node.id] ? '▾' : '▸'}
          </button>
        )}
      </li>
      {hasChildren && openGroups[node.id] && subChildren.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          openGroups={openGroups}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  );
};

const ProductImage = ({ src, alt }) => {
  const [imgSrc, setImgSrc] = useState(DEFAULT_IMAGE);
  useEffect(() => {
    setImgSrc(src ? buildUploadUrl(src) : DEFAULT_IMAGE);
  }, [src]);
  return (
    <img
      src={imgSrc}
      alt={alt}
      className="product-image"
      onError={() => setImgSrc(DEFAULT_IMAGE)}
    />
  );
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts]   = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedId, setSelectedId]     = useState(null);
  const [openGroups, setOpenGroups]     = useState({});
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const fetchProduits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products?limit=500&sortBy=createdAt&sortOrder=desc`),
        fetch(`${API_BASE_URL}/categories`),
      ]);

      const prodData = await prodRes.json();
      if (!prodRes.ok) throw new Error(prodData.message || `Erreur ${prodRes.status}`);

      let list = [];
      if (Array.isArray(prodData))                         list = prodData;
      else if (Array.isArray(prodData.products))            list = prodData.products;
      else if (prodData.success && prodData.data?.products) list = prodData.data.products;
      else if (prodData.success && Array.isArray(prodData.data)) list = prodData.data;

      list.sort((a, b) =>
        new Date(b.createdAt || b.created_at || 0) -
        new Date(a.createdAt || a.created_at || 0)
      );
      setAllProducts(list);

      if (catRes.ok) {
        const catData = await catRes.json();
        const tree = catData.success ? catData.data : [];
        setCategoryTree(tree);
        // Ouvre tous les groupes parents par défaut
        const defaults = {};
        tree.forEach((g) => { defaults[g.id] = true; });
        setOpenGroups(defaults);
      }
    } catch (err) {
      setError(err.message.includes('Failed to fetch')
        ? 'Impossible de joindre le serveur.'
        : err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProduits(); }, [fetchProduits]);

  const filteredProducts = useMemo(() => {
    const cats = getCategoriesForId(selectedId, categoryTree);
    if (!cats) return allProducts;
    return allProducts.filter((p) => {
      const cat = (p.categorie || p.category || '').toLowerCase();
      return cats.some((c) => cat === c.toLowerCase());
    });
  }, [allProducts, selectedId, categoryTree]);

  const toggleGroup = (groupId, e) => {
    e.stopPropagation();
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelect = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="products-container">
        <div className="loading">
          <div className="loading-spinner" />
          Chargement des étals…
        </div>
      </div>
    );
  }

  return (
    <div className="products-container">
      {/* En-tête */}
      <div className="products-header">
        <div className="products-header-left">
          <h2>Étals</h2>
          <span className="products-count">
            {filteredProducts.length} denrée{filteredProducts.length !== 1 ? 's' : ''}
            {selectedId ? ` · ${getLabelForId(selectedId, categoryTree)}` : ''}
          </span>
        </div>
        <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>
          ☰ Filtres
        </button>
      </div>

      <div className="products-layout">

        {/* Sidebar filtre */}
        <aside className={`products-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-title">Catégories</span>
            <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
          </div>

          <ul className="category-tree">
            <li
              className={`tree-all${!selectedId ? ' active' : ''}`}
              onClick={() => handleSelect(null)}
            >
              Tous les étals
            </li>

            {categoryTree.filter((g) => g.actif).map((group) => (
              <TreeNode
                key={group.id}
                node={group}
                depth={0}
                selectedId={selectedId}
                openGroups={openGroups}
                onSelect={handleSelect}
                onToggle={toggleGroup}
              />
            ))}
          </ul>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Contenu principal */}
        <main className="products-main">
          {error ? (
            <div className="error">
              <p>{error}</p>
              <button className="product-button" onClick={fetchProduits}>Réessayer</button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>Aucune denrée pour cette catégorie.</p>
              <button className="product-button" onClick={() => setSelectedId(null)}>
                Voir toutes les denrées
              </button>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((produit) => {
                const id = produit._id || produit.id;
                const prix = `${Number(produit.prix || 0).toLocaleString('fr-FR')} FCFA / ${produit.unite || 'kg'}`;
                return (
                  <div
                    key={id}
                    className={`product-card${produit.isFeatured || produit.is_featured ? ' product-card--sponsored' : ''}`}
                    onClick={() => navigate(`/produits/${id}`)}
                  >
                    <div className="product-image-container">
                      <ProductImage src={produit.imageUrl} alt={produit.nom} />
                      {(produit.isFeatured || produit.is_featured) && (
                        <span className="sponsored-badge">⭐ Sponsorisé</span>
                      )}
                    </div>
                    <div className="product-info">
                      {produit.categorie && (
                        <span className="product-category-badge">{produit.categorie}</span>
                      )}
                      <h3>{produit.nom || produit.name || 'Denrée'}</h3>
                      {produit.description && (
                        <p className="product-description">{produit.description}</p>
                      )}
                      <p className="product-price">{prix}</p>
                    </div>
                    <button
                      className="product-button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/produits/${id}`); }}
                    >
                      Voir l'étal
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
