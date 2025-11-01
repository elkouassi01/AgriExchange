// src/components/PromoBanner.jsx
import React, { useState, useEffect } from 'react';
import './PromoBanner.css';

const PromoBanner = () => {
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  
  const promotions = [
    "🎉 Nouveauté ! - tous les contacts sont certifés",
    "🚚 Le consommateur peut discuter de l a livraison lui meme avec le vendeur",
    "🌱 Eléveurs et Cultivateur rejoignez-nous gratuitement et exposé vos produits librement",
    "⭐ Abonnement GOLD pour les consommateurs: 3 mois offerts pour tout nouvel abonnement !"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex(prevIndex => (prevIndex + 1) % promotions.length);
    }, 5000); // Change toutes les 5 secondes

    return () => clearInterval(interval);
  }, [promotions.length]);

  return (
    <div className="promo-banner">
      <div className="promo-container">
        <div className="promo-icon">🎁</div>
        <div className="promo-marquee">
          <div 
            className="promo-text" 
            key={currentPromoIndex}
          >
            {promotions[currentPromoIndex]}
          </div>
        </div>
        <button className="close-btn" onClick={() => document.querySelector('.promo-banner').style.display = 'none'}>
          ×
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;