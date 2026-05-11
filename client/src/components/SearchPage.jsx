import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/axiosConfig';
import { buildUploadUrl } from '../config/api';
import './CategoriePage.css';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'légumes', label: 'Légumes' },
  { value: 'viandes', label: 'Viandes' },
  { value: 'produits laitiers', label: 'Produits laitiers' },
  { value: 'céréales', label: 'Céréales' },
  { value: 'épices', label: 'Épices' },
  { value: 'autres', label: 'Autres' },
];

const ETATS = ['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Plus récents' },
  { value: 'createdAt-asc', label: 'Plus anciens' },
  { value: 'prix-asc', label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom-asc', label: 'Nom A-Z' },
  { value: 'nom-desc', label: 'Nom Z-A' },
];

const ProductImage = ({ src, alt, onClick }) => {
  const [imgSrc, setImgSrc] = useState(DEFAULT_IMAGE);
  useEffect(() => { setImgSrc(src ? buildUploadUrl(src) : DEFAULT_IMAGE); }, [src]);
  return (
    <img
      src={imgSrc}
      alt={alt}
      className="product-image"
      onError={() => setImgSrc(DEFAULT_IMAGE)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};

const hasActiveSearch = (f) =>
  Boolean(f.search || f.categorie || f.etat || f.minPrix || f.maxPrix);

const SearchPage = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(urlParams.get('q') || '');
  const [filters, setFilters] = useState({
    search: urlParams.get('q') || '',
    categorie: '',
    etat: '',
    minPrix: '',
    maxPrix: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 12,
  });

  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, totalProducts: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchProduits = useCallback(async (params) => {
    if (!hasActiveSearch(params)) {
      setProduits([]);
      setPagination({ currentPage: 1, totalPages: 0, totalProducts: 0 });
      return;
    }
    setLoading(true);
    setErreur(null);
    try {
      const q = new URLSearchParams();
      q.set('page', params.page);
      q.set('limit', params.limit);
      q.set('sortBy', params.sortBy);
      q.set('sortOrder', params.sortOrder);
      if (params.search) q.set('search', params.search);
      if (params.categorie) q.set('categorie', params.categorie);
      if (params.etat) q.set('etat', params.etat);
      if (params.minPrix) q.set('minPrix', params.minPrix);
      if (params.maxPrix) q.set('maxPrix', params.maxPrix);

      const res = await api.get(`/products?${q.toString()}`);
      const data = res.data;

      let docs = [];
      let pag = { currentPage: 1, totalPages: 1, totalProducts: 0 };

      if (data.success && data.data?.products) {
        docs = data.data.products;
        pag = data.data.pagination || pag;
      } else if (Array.isArray(data)) {
        docs = data;
      }

      setProduits(docs.map((p) => ({
        ...p,
        nom: p.nom || p.name || 'Produit sans nom',
        description: p.description || '',
        imageUrl: p.imageUrl || p.image || '',
        prixFormate: `${Number(p.prix || 0).toLocaleString('fr-FR')} FCFA / ${p.unite || 'kg'}`,
      })));
      setPagination(pag);
    } catch (err) {
      console.error('[SearchPage]', err);
      setErreur('Erreur lors de la recherche. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync URL ?q= → update filters when navigating from navbar
  useEffect(() => {
    const q = urlParams.get('q') || '';
    setSearchInput(q);
    setFilters((prev) => ({ ...prev, search: q, page: 1 }));
  }, [urlParams]);

  useEffect(() => {
    fetchProduits(filters);
  }, [filters, fetchProduits]);

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const handleSortChange = (value) => {
    const [sortBy, sortOrder] = value.split('-');
    setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const handleReset = () => {
    setSearchInput('');
    setFilters({
      search: '',
      categorie: '',
      etat: '',
      minPrix: '',
      maxPrix: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      limit: 12,
    });
  };

  const activeFiltersCount = [
    filters.search,
    filters.categorie,
    filters.etat,
    filters.minPrix,
    filters.maxPrix,
    filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc',
  ].filter(Boolean).length;

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  return (
    <div className="category-container">
      <div className="category-header">
        <h1>Recherche de produits</h1>
        {pagination.totalProducts > 0 && (
          <span className="product-count">{pagination.totalProducts} résultat(s)</span>
        )}
      </div>

      {/* Barre de recherche */}
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Nom du produit, description, tags..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
          autoFocus
        />
        <button type="submit" className="search-btn">Rechercher</button>
        <button
          type="button"
          className={`filters-toggle-btn ${activeFiltersCount > 0 ? 'has-filters' : ''}`}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filtres {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
        </button>
      </form>

      {/* Panneau filtres avancés */}
      {filtersOpen && (
        <div className="filters-panel">
          <div className="filters-grid">
            <div className="filter-group">
              <label>Catégorie</label>
              <select value={filters.categorie} onChange={(e) => updateFilter('categorie', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>État du produit</label>
              <select value={filters.etat} onChange={(e) => updateFilter('etat', e.target.value)}>
                <option value="">Tous les états</option>
                {ETATS.map((e) => (
                  <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Prix min (FCFA)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={filters.minPrix}
                onChange={(e) => updateFilter('minPrix', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Prix max (FCFA)</label>
              <input
                type="number"
                min="0"
                placeholder="Sans limite"
                value={filters.maxPrix}
                onChange={(e) => updateFilter('maxPrix', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>Trier par</label>
              <select value={currentSortValue} onChange={(e) => handleSortChange(e.target.value)}>
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <button className="reset-btn" onClick={handleReset}>Réinitialiser les filtres</button>
          )}
        </div>
      )}

      {/* Chips filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="active-filters">
          {filters.search && (
            <span className="filter-chip">
              "{filters.search}"
              <button onClick={() => { setSearchInput(''); updateFilter('search', ''); }}>×</button>
            </span>
          )}
          {filters.categorie && (
            <span className="filter-chip">
              {CATEGORIES.find((c) => c.value === filters.categorie)?.label || filters.categorie}
              <button onClick={() => updateFilter('categorie', '')}>×</button>
            </span>
          )}
          {filters.etat && (
            <span className="filter-chip">
              {filters.etat}
              <button onClick={() => updateFilter('etat', '')}>×</button>
            </span>
          )}
          {filters.minPrix && (
            <span className="filter-chip">
              Min : {Number(filters.minPrix).toLocaleString('fr-FR')} FCFA
              <button onClick={() => updateFilter('minPrix', '')}>×</button>
            </span>
          )}
          {filters.maxPrix && (
            <span className="filter-chip">
              Max : {Number(filters.maxPrix).toLocaleString('fr-FR')} FCFA
              <button onClick={() => updateFilter('maxPrix', '')}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Recherche en cours...</p>
        </div>
      ) : erreur ? (
        <div className="error-container">
          <p>{erreur}</p>
          <button className="retry-button" onClick={() => fetchProduits(filters)}>Réessayer</button>
        </div>
      ) : !hasActiveSearch(filters) ? (
        <div className="empty-container">
          <p style={{ fontSize: '1.1rem' }}>
            Entrez un terme ou sélectionnez un filtre pour trouver des produits agricoles.
          </p>
        </div>
      ) : produits.length === 0 ? (
        <div className="empty-container">
          <p>Aucun produit trouvé pour ces critères.</p>
          <button className="back-button" onClick={handleReset}>Effacer les filtres</button>
        </div>
      ) : (
        <div className="products-grid">
          {produits.map((produit) => (
            <div key={produit._id || produit.id} className="product-card">
<div className="image-container">
                 <ProductImage src={produit.imageUrl} alt={produit.nom} onClick={() => navigate(`/produits/${produit._id || produit.id}`)} />
               </div>
              <div className="product-info">
                <h3>{produit.nom}</h3>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {produit.categorie && (
                    <span className="etat-badge">{produit.categorie}</span>
                  )}
                  {produit.etat && (
                    <span className="etat-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}>
                      {produit.etat}
                    </span>
                  )}
                </div>
                {produit.description && (
                  <p className="product-description">{produit.description}</p>
                )}
                <p className="product-price">{produit.prixFormate}</p>
                <button
                  className="product-button"
                  onClick={() => navigate(`/produits/${produit._id || produit.id}`)}
                >
                  Voir l'étal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.currentPage <= 1}
            onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
          >
            ← Précédent
          </button>
          <span>Page {pagination.currentPage} / {pagination.totalPages}</span>
          <button
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
          >
            Suivant →
          </button>
        </div>
      )}

      <div className="category-footer">
        <button onClick={() => navigate('/produits')}>Catégories</button>
        <button onClick={() => navigate('/')}>Accueil</button>
      </div>
    </div>
  );
};

export default SearchPage;
