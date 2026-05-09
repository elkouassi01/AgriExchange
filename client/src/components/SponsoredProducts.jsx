import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildUploadUrl } from '../config/api';
import { DEFAULT_PRODUCT_IMAGE } from '../config/constants';
import api from '../services/axiosConfig';
import './SponsoredProducts.css';

const formatFCFA = (amount) =>
  new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

function SponsoredCard({ product, onClick }) {
  const [imgSrc, setImgSrc] = useState(
    product.imageUrl ? buildUploadUrl(product.imageUrl) : DEFAULT_PRODUCT_IMAGE,
  );

  return (
    <button className="sp-card" onClick={onClick} aria-label={`Voir ${product.nom}`}>
      <div className="sp-card__img-wrap">
        <img
          src={imgSrc}
          alt={product.nom}
          className="sp-card__img"
          onError={() => setImgSrc(DEFAULT_PRODUCT_IMAGE)}
        />
        <span className="sp-card__badge">⭐ Sponsorisé</span>
      </div>
      <div className="sp-card__body">
        <p className="sp-card__nom">{product.nom}</p>
        <p className="sp-card__prix">
          {formatFCFA(product.prix)} / {product.unite || 'kg'}
        </p>
        {product.vendeur?.fermeNom && (
          <p className="sp-card__ferme">{product.vendeur.fermeNom}</p>
        )}
      </div>
    </button>
  );
}

export default function SponsoredProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/products/sponsored')
      .then((res) => setProducts(res.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const cardW = track.querySelector('.sp-card')?.offsetWidth || 240;
    track.scrollBy({ left: dir * (cardW + 16), behavior: 'smooth' });
  };

  if (loading || products.length === 0) return null;

  return (
    <section className="sp-section">
      <div className="sp-header">
        <div className="sp-header__left">
          <span className="sp-header__icon">⭐</span>
          <div>
            <h2 className="sp-header__title">Produits à la une</h2>
            <p className="sp-header__sub">Sélectionnés par nos agriculteurs partenaires</p>
          </div>
        </div>
        <div className="sp-nav">
          <button className="sp-nav__btn" onClick={() => scroll(-1)} aria-label="Précédent">‹</button>
          <button className="sp-nav__btn" onClick={() => scroll(1)} aria-label="Suivant">›</button>
        </div>
      </div>

      <div className="sp-track" ref={trackRef}>
        {products.map((p) => (
          <SponsoredCard
            key={p.id}
            product={p}
            onClick={() => navigate(`/produits/${p.id}`)}
          />
        ))}
      </div>
    </section>
  );
}
