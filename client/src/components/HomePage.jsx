import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import Footer from './Footer';
import PromoBanner from './PromoBanner';
import Fireworks from '../components/Fireworks';
import api from '../services/axiosConfig';

function HomePage() {
  const [sponsoredProducts, setSponsoredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexGroupe, setIndexGroupe] = useState(0);

  // Récupérer les produits sponsorisés pour le carousel
  useEffect(() => {
    api.get('/products/sponsored?limit=8')
      .then(res => {
        const products = res.data.products || [];
        setSponsoredProducts(products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Groupes de 3 produits pour le carousel
  const groupes = useMemo(() => {
    if (!sponsoredProducts.length) return [];
    const nextGroups = [];
    for (let i = 0; i < sponsoredProducts.length; i += 3) {
      nextGroups.push(sponsoredProducts.slice(i, i + 3));
    }
    return nextGroups;
  }, [sponsoredProducts]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndexGroupe((prevIndex) => (prevIndex + 1) % groupes.length);
    }, 30000);

    return () => clearInterval(interval);
  }, [groupes.length]);

  const allerAuSuivant = () => {
    setIndexGroupe((prevIndex) => (prevIndex + 1) % groupes.length);
  };

  const allerAuPrecedent = () => {
    setIndexGroupe((prevIndex) => (prevIndex === 0 ? groupes.length - 1 : prevIndex - 1));
  };

  return (
    <div className="home-container">
      <Fireworks />
      <PromoBanner />

      <section className="hero">
        <h1>Bienvenue sur VivriMarket 🌾</h1>
        <p>Votre marche ivoirien de vivriers et d'elevage, ou le client rencontre les agriculteurs.</p>
      </section>

      <section className="sample-products">
        <h2>🌟 Denrées à la une - Sélection premium</h2>
        {loading ? (
          <div className="carousel-loading">Chargement des denrées...</div>
        ) : groupes.length ? (
          <div className="carousel-wrapper">
            <button className="carousel-button left" onClick={allerAuPrecedent}>⏮</button>
            <div className="carousel-group">
{groupes[indexGroupe]?.map((produit, index) => (
                 <div key={produit.id || index} className="product-card animated-slide">
                   <Link to={`/produits/${produit.id}`}>
                     <img src={produit.imageUrl || produit.image} alt={produit.nom} />
                   </Link>
                   <p>{produit.nom}</p>
                   <span className="price-badge">{produit.prix?.toLocaleString('fr-FR')} FCFA / {produit.unite || 'kg'}</span>
                 </div>
               ))}
             </div>
            <button className="carousel-button right" onClick={allerAuSuivant}>⏭</button>
          </div>
        ) : (
          <p className="no-products">Aucune denrée à la une pour le moment.</p>
        )}
        <Link to="/produits" className="cta-button">Voir toutes les denrées</Link>
        <p className="cta-subtext">Découvrez notre large catalogue et trouvez vos aliments préférés.</p>
      </section>

      <section className="special-promo">
        <div className="home-promo-card">
          <div className="home-promo-badge">PROMO</div>
          <h2>Offre Speciale de Lancement !</h2>
          <p className="home-promo-highlight">
            🎉 Offre speciale agriculteurs :
            <br />
            6 mois d'inscription 100% gratuite ! <strong>🎉</strong>
          </p>
          <p>Valable jusqu'au 31 Decembre 2026</p>
          <Link to="/inscription?type=agriculteur&formule=BLEU" className="home-promo-button">
            Profiter de l'offre
          </Link>
        </div>
      </section>

      <section className="about-section">
        <div className="about-content">
          <h2>Pourquoi choisir VivriMarket ?</h2>
          <ul className="benefits-list">
            <li>✅ Denrées fraîches directement des agriculteurs locaux</li>
            <li>✅ Prix de gros sans intermediaire</li>
            <li>✅ Livraison rapide dans toute la Cote d'Ivoire</li>
            <li>✅ Paiements securises et multiples options</li>
            <li>✅ Support client 7j/7</li>
          </ul>
        </div>
      </section>

      <a
        href="https://wa.me/212614225951?text=Bonjour%20AgriExchange%2C%20j%27ai%20besoin%20d%27aide%20🙂"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter le support WhatsApp"
      >
        <div className="whatsapp-content">
          <img src="https://img.icons8.com/color/48/000000/whatsapp--v1.png" alt="WhatsApp Chat" />
          <span className="whatsapp-label">Support</span>
        </div>
      </a>

      <Footer />
    </div>
  );
}

export default HomePage;
