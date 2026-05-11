import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/axiosConfig';
import './CategoriePage.css';
import { buildUploadUrl } from '../config/api';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1594282486555-88f2f92b9a68';

const ETATS = ['', 'frais', 'sec', 'transforme', 'congele', 'bio'];
const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Plus récents' },
  { value: 'createdAt-asc', label: 'Plus anciens' },
  { value: 'prix-asc', label: 'Prix croissant' },
  { value: 'prix-desc', label: 'Prix décroissant' },
  { value: 'nom-asc', label: 'Nom A-Z' },
  { value: 'nom-desc', label: 'Nom Z-A' },
];

const ProductImage = ({ src, alt, onClick }) => {
  const [imageSrc, setImageSrc] = useState(DEFAULT_IMAGE);

  useEffect(() => {
    setImageSrc(src ? buildUploadUrl(src) : DEFAULT_IMAGE);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="product-image"
      onError={() => setImageSrc(DEFAULT_IMAGE)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};

const CategoriePage = () => {
  const { nomCategorie } = useParams();
  const navigate = useNavigate();

  const [produits, setProduits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalProducts: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    etat: '',
    minPrix: '',
    maxPrix: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 12,
  });

  const [searchInput, setSearchInput] = useState('');

  const fetchProduits = useCallback(async (params) => {
    try {
      setLoading(true);
      setErreur(null);

      const query = new URLSearchParams();
      query.set('categorie', nomCategorie);
      query.set('page', params.page);
      query.set('limit', params.limit);
      query.set('sortBy', params.sortBy);
      query.set('sortOrder', params.sortOrder);
      if (params.search) query.set('search', params.search);
      if (params.etat) query.set('etat', params.etat);
      if (params.minPrix) query.set('minPrix', params.minPrix);
      if (params.maxPrix) query.set('maxPrix', params.maxPrix);

      const res = await api.get(`/products?${query.toString()}`);
      const data = res.data;

      let docs = [];
      let pag = { currentPage: 1, totalPages: 1, totalProducts: 0 };

      if (data.success && data.data?.products) {
        docs = data.data.products;
        pag = data.data.pagination || pag;
      } else if (Array.isArray(data)) {
        docs = data;
      } else if (Array.isArray(data.data)) {
        docs = data.data;
      }

      const formattes = docs.map((p) => ({
        ...p,
        nom: p.nom || p.name || 'Produit sans nom',
        description: p.description || '',
        imageUrl: p.imageUrl || p.image || '',
        prixFormate: `${Number(p.prix || 0).toLocaleString('fr-FR')} FCFA / ${p.unite || 'kg'}`,
      }));

      setProduits(formattes);
      setPagination(pag);
    } catch (err) {
      console.error('Erreur chargement produits :', err);
      setErreur('Erreur lors du chargement des produits.');
    } finally {
      setLoading(false);
    }
  }, [nomCategorie]);

  useEffect(() => {
    fetchProduits(filters);
  }, [filters, fetchProduits]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

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
    filters.etat,
    filters.minPrix,
    filters.maxPrix,
    filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc',
  ].filter(Boolean).length;

  const currentSortValue = `${filters.sortBy}-${filters.sortOrder}`;

  return (
    <div className="category-container">
      <div className="category-header">
        <h1>{nomCategorie}</h1>
        <span className="product-count">{pagination.totalProducts} produit(s)</span>
      </div>

      {/* Barre de recherche */}
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="search-input"
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
              <label>État du produit</label>
              <select value={filters.etat} onChange={(e) => updateFilter('etat', e.target.value)}>
                <option value="">Tous les états</option>
                {ETATS.filter(Boolean).map((e) => (
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

      {/* Tags filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="active-filters">
          {filters.search && (
            <span className="filter-chip">
              Recherche : "{filters.search}"
              <button onClick={() => { setSearchInput(''); updateFilter('search', ''); }}>×</button>
            </span>
          )}
          {filters.etat && (
            <span className="filter-chip">
              État : {filters.etat}
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
          <p>Chargement...</p>
        </div>
      ) : erreur ? (
        <div className="error-container">
          <p>{erreur}</p>
          <button onClick={() => fetchProduits(filters)}>Réessayer</button>
        </div>
      ) : produits.length === 0 ? (
        <div className="empty-container">
          <p>Aucun produit trouvé pour ces critères.</p>
          {activeFiltersCount > 0 && (
            <button onClick={handleReset}>Effacer les filtres</button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {produits.map((produit) => (
            <div key={produit._id || produit.id} className={`product-card${produit.isFeatured || produit.is_featured ? ' product-card--sponsored' : ''}`}>
<div className="image-container">
                 <ProductImage src={produit.imageUrl} alt={produit.nom} onClick={() => navigate(`/produits/${produit._id || produit.id}`)} />
                 {(produit.isFeatured || produit.is_featured) && (
                   <span className="sponsored-badge">⭐ Sponsorisé</span>
                 )}
               </div>
              <div className="product-info">
                <h3>{produit.nom}</h3>
                {produit.etat && <span className="etat-badge">{produit.etat}</span>}
                {produit.description && <p className="product-description">{produit.description}</p>}
                <p className="product-price">{produit.prixFormate}</p>
                <button className="product-button" onClick={() => navigate(`/produits/${produit._id || produit.id}`)}>
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
        <button onClick={() => navigate('/categories')}>Catégories</button>
        <button onClick={() => navigate('/')}>Accueil</button>
      </div>
    </div>
  );
};

export default CategoriePage;
