import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import Footer from './Footer';
import PromoBanner from './PromoBanner'; // Import du composant de bannière promo

// Images de produits
import tomate from '../assets/tomate.jpg';
import salade from '../assets/salade.jpg';
import concombre from '../assets/concombre.jpg';
import pomme_terre from '../assets/pomme_terre.jpg';

function HomePage() {
  // Liste de tous les produits phares avec emoji + image
  const produitsPhares = [
    { nom: "Tomates Bio", image: tomate, emoji: "🍅" },
    { nom: "Salades Fraîches", image: salade, emoji: "🥬" },
    { nom: "Pommes de Terre", image: pomme_terre, emoji: "🥔" },
    { nom: "Concombres Frais", image: concombre, emoji: "🥒" },
    { nom: "Tomates Cerises", image: tomate, emoji: "🍅" },
    { nom: "Laitues Croquantes", image: salade, emoji: "🥬" },
    { nom: "Patates Douces", image: pomme_terre, emoji: "🥔" },
    { nom: "Cornichons Frais", image: concombre, emoji: "🥒" },
  ];

  const [indexGroupe, setIndexGroupe] = useState(0);

  // Découpe les produits en groupes de 3
  const groupes = [];
  for (let i = 0; i < produitsPhares.length; i += 3) {
    groupes.push(produitsPhares.slice(i, i + 3));
  }

  // Défilement automatique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      allerAuSuivant();
    }, 30000);
    return () => clearInterval(interval); // Nettoyage à la fin
  }, [indexGroupe]);

  // Aller au groupe suivant
  const allerAuSuivant = () => {
    setIndexGroupe((prevIndex) => (prevIndex + 1) % groupes.length);
  };

  // Revenir au groupe précédent
  const allerAuPrecedent = () => {
    setIndexGroupe((prevIndex) =>
      prevIndex === 0 ? groupes.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="home-container">
      {/* Bannière promotionnelle */}
      <PromoBanner />
      
      {/* En-tête d'accueil */}
      <section className="hero">
        <h1>Bienvenue sur AgriMarket 🌾</h1>
        <p>
          Votre marché Ivoirien de vivriers et d'élevage, où le client rencontre les agriculteurs.
        </p>
      </section>

      {/* Section des produits phares avec carrousel */}
      <section className="sample-products">
        <h2>Achetez vos aliments favoris en gros à des tarifs bord champ</h2>

        {/* Carrousel + boutons de navigation */}
        <div className="carousel-wrapper">
          {/* Bouton précédent */}
          <button
            className="carousel-button left"
            aria-label="Groupe précédent"
            onClick={allerAuPrecedent}
          >
            ⏮
          </button>

          {/* Groupe de 3 produits actuellement visible */}
          <div className="carousel-group">
            {groupes[indexGroupe].map((produit, index) => (
              <div key={index} className="product-card animated-slide">
                <img src={produit.image} alt={produit.nom} />
                <p>{produit.emoji} {produit.nom}</p>
              </div>
            ))}
          </div>

          {/* Bouton suivant */}
          <button
            className="carousel-button right"
            aria-label="Groupe suivant"
            onClick={allerAuSuivant}
          >
            ⏭
          </button>
        </div>

        {/* Lien vers tous les produits */}
        <Link to="/produits" className="cta-button">
          Voir tous les produits
        </Link>
        <p className="cta-subtext">Découvrez notre large catalogue et trouvez vos aliments préférés.</p>
      </section>

      {/* Section promotion spéciale */}
      <section className="special-promo">
        <div className="promo-card">
          <div className="promo-badge">PROMO</div>
          <h2>Offre Spéciale de Lancement !</h2>
          <p className="promo-highlight">🎉 Offre spéciale agriculteurs :<br/> 6 mois d’inscription 100% gratuite ! <strong>🎉</strong></p>
          <p>Valable jusqu'au 31 Décembre 2025</p>
          
          <Link to="/inscription?type=agriculteur&formule=OFFRE_GRATUITE" className="promo-button" >
            Profiter de l'offre
          </Link>
          
        </div>
      </section>

      {/* Section À propos */}
      <section className="about-section">
        <div className="about-content">
          <h2>Pourquoi choisir AgriMarket ?</h2>
          <ul className="benefits-list">
            <li>✅ Produits frais directement des agriculteurs locaux</li>
            <li>✅ Prix de gros sans intermédiaire</li>
            <li>✅ Livraison rapide dans toute la Côte d'Ivoire</li>
            <li>✅ Paiements sécurisés et multiples options</li>
            <li>✅ Support client 7j/7</li>
          </ul>
        </div>
      </section>

      {/* ✅ Bouton WhatsApp flottant */}
      <a
        href="https://wa.me/212614225951?text=Bonjour%20AgriExchange%2C%20j%27ai%20besoin%20d%27aide%20😊"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter le support WhatsApp"
      >
        <div className="whatsapp-content">
          <img
            src="https://img.icons8.com/color/48/000000/whatsapp--v1.png"
            alt="WhatsApp Chat"
          />
          <span className="whatsapp-label">Support</span>
        </div>
      </a>

      <Footer />
    </div>
  );
}

export default HomePage;