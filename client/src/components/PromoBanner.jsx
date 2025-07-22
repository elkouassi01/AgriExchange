// src/components/PromoBanner.jsx
import React, { useState, useEffect } from 'react';
import './PromoBanner.css';

const PromoBanner = () => {
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  
  const promotions = [
    "🎉 Nouveauté ! -10% sur tous les produits bio avec le code BIO10",
    "🚚 Livraison gratuite à partir de 15 000 FCFA d'achats !",
    "🌱 Nouveaux agriculteurs rejoignez-nous : 0% de commission pendant 1 mois !",
    "⭐ Abonnement GOLD : 3 mois offerts pour tout nouvel abonnement !"
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