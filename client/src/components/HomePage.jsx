import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';
import Footer from './Footer';

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
    { nom: "Autres Tomates", image: tomate, emoji: "🍅" },
    { nom: "Autres Salades", image: salade, emoji: "🥬" },
    { nom: "Autres Pommes", image: pomme_terre, emoji: "🥔" },
    { nom: "Autres Concombres", image: concombre, emoji: "🥒" },
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
      {/* En-tête d'accueil */}
      <section className="hero">
        <h1>Bienvenue sur AgriMarket 🌾</h1>
        <p>
          Votre marché Ivoirien de vivriers et d'élévage, où le client rencontre les agriculteurs.
        </p>
      </section>

      {/* Section des produits phares avec carrousel */}
      <section className="sample-products">
        <h2>Acheter vos aliments favoris en gros a des tarifs bord champ</h2>

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

      {/* Section À propos */}
     

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
