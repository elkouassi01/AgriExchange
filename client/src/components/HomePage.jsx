import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import Footer from './Footer';
import PromoBanner from './PromoBanner';
import Fireworks from '../components/Fireworks';

import tomate from '../assets/tomate.jpg';
import salade from '../assets/salade.jpg';
import concombre from '../assets/concombre.jpg';
import pommeTerre from '../assets/pomme_terre.jpg';

const PRODUITS_PHARES = [
  { nom: 'Tomates Bio', image: tomate, emoji: '🍅' },
  { nom: 'Salades Fraiches', image: salade, emoji: '🥬' },
  { nom: 'Pommes de Terre', image: pommeTerre, emoji: '🥔' },
  { nom: 'Concombres Frais', image: concombre, emoji: '🥒' },
  { nom: 'Tomates Cerises', image: tomate, emoji: '🍅' },
  { nom: 'Laitues Croquantes', image: salade, emoji: '🥬' },
  { nom: 'Patates Douces', image: pommeTerre, emoji: '🥔' },
  { nom: 'Cornichons Frais', image: concombre, emoji: '🥒' },
];

function HomePage() {
  const [indexGroupe, setIndexGroupe] = useState(0);

  const groupes = useMemo(() => {
    const nextGroups = [];
    for (let i = 0; i < PRODUITS_PHARES.length; i += 3) {
      nextGroups.push(PRODUITS_PHARES.slice(i, i + 3));
    }
    return nextGroups;
  }, []);

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
        <h2>Achetez vos aliments favoris en gros a des tarifs bord champ</h2>
        <div className="carousel-wrapper">
          <button className="carousel-button left" onClick={allerAuPrecedent}>⏮</button>
          <div className="carousel-group">
            {groupes[indexGroupe].map((produit, index) => (
              <div key={index} className="product-card animated-slide">
                <img src={produit.image} alt={produit.nom} />
                <p>{produit.emoji} {produit.nom}</p>
              </div>
            ))}
          </div>
          <button className="carousel-button right" onClick={allerAuSuivant}>⏭</button>
        </div>
        <Link to="/produits" className="cta-button">Voir tous les produits</Link>
        <p className="cta-subtext">Decouvrez notre large catalogue et trouvez vos aliments preferes.</p>
      </section>

      <section className="special-promo">
        <div className="promo-card">
          <div className="promo-badge">PROMO</div>
          <h2>Offre Speciale de Lancement !</h2>
          <p className="promo-highlight">
            🎉 Offre speciale agriculteurs :
            <br />
            6 mois d'inscription 100% gratuite ! <strong>🎉</strong>
          </p>
          <p>Valable jusqu'au 31 Decembre 2025</p>
          <Link to="/inscription?type=agriculteur&formule=OFFRE_GRATUITE" className="promo-button">
            Profiter de l'offre
          </Link>
        </div>
      </section>

      <section className="about-section">
        <div className="about-content">
          <h2>Pourquoi choisir VivriMarket ?</h2>
          <ul className="benefits-list">
            <li>✅ Produits frais directement des agriculteurs locaux</li>
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
