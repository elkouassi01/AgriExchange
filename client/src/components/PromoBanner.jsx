// src/components/PromoBanner.jsx
import React, { useState, useEffect } from 'react';
import './PromoBanner.css';

const PromoBanner = () => {
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  
  const promotions = [
    "🎉 Agriculteurs — Inscription 100% GRATUITE jusqu'au 31 décembre 2026, quelle que soit la formule !",
    "🌾 Des centaines de denrées agricoles fraîches disponibles — légumes, céréales, fruits, élevage et plus encore",
    "📞 Obtenez les coordonnées d'un vendeur dès 150 FCFA pour les membres, 300 FCFA sans compte",
    "🔒 Paiements sécurisés via CinetPay — Mobile Money, carte bancaire, Orange Money acceptés",
    "🚚 Discutez directement avec l'agriculteur pour organiser la livraison selon vos besoins",
    "✅ Tous les contacts vendeurs sont vérifiés — achetez en toute confiance",
    "📲 Recevez vos confirmations d'achat directement sur WhatsApp après chaque transaction",
    "🌱 Éleveurs et cultivateurs — rejoignez-nous gratuitement et publiez vos denrées dès aujourd'hui",
    "⭐ Formule PLATINUM agriculteur : visibilité maximale, denrées illimitées et support prioritaire",
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