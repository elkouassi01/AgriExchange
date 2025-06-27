import React from "react";
import { useNavigate } from "react-router-dom";
import './OffersPage.css';

const OffersPage = () => {
  const navigate = useNavigate();

  const handleSubscription = (type, formule) => {
    navigate(`/inscription?type=${type}&formule=${formule}`);
  };

  return (
    <div className="offers-container">
      <header className="offers-header">
        <h1>🎯 Nos Offres d'Abonnement</h1>
        <p className="subtitle">Choisissez l'abonnement qui correspond à vos besoins</p>
      </header>

      <div className="offers-grid">
        <section className="offer-category">
          <div className="category-header">
            <div className="icon">👤</div>
            <h2>Offres Consommateurs</h2>
          </div>
          
          <div className="offer-cards">
            <div className="offer-card blue">
              <div className="offer-badge">BLEU</div>
              <ul className="offer-features">
                <li>Accès à 1 vendeur/mois</li>
                <li>Notifications des promotions</li>
                <li>Support de base</li>
              </ul>
              <div className="offer-price">
                <span className="price">1 000 FCFA</span>
                <span className="period">/mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("consommateur", "BLEU")}
              >
                S'abonner
              </button>
            </div>

            <div className="offer-card gold">
              <div className="offer-badge">GOLD</div>
              <ul className="offer-features">
                <li>Accès à 5 vendeurs/mois</li>
                <li>Notifications en temps réel</li>
                <li>Support prioritaire</li>
              </ul>
              <div className="offer-price">
                <span className="price">3 000 FCFA</span>
                <span className="period">/mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("consommateur", "GOLD")}
              >
                S'abonner
              </button>
            </div>

            <div className="offer-card platinum">
              <div className="offer-badge">PLATINUM</div>
              <ul className="offer-features">
                <li>Accès illimité aux vendeurs</li>
                <li>Notifications premium</li>
                <li>Support 24/7</li>
              </ul>
              <div className="offer-price">
                <span className="price">5 000 FCFA</span>
                <span className="period">/mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("consommateur", "PLATINUM")}
              >
                S'abonner
              </button>
            </div>
          </div>
        </section>

        <section className="offer-category">
          <div className="category-header">
            <div className="icon">🌾</div>
            <h2>Offres Agriculteurs</h2>
          </div>
          
          <div className="offer-cards">
            <div className="offer-card blue">
              <div className="offer-badge">BLEU</div>
              <ul className="offer-features">
                <li>1 mois gratuit</li>
                <li>Max 2 produits (même catégorie)</li>
                <li>Statistiques de base</li>
              </ul>
              <div className="offer-price">
                <span className="price">500 FCFA</span>
                <span className="period">/mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("agriculteur", "BLEU")}
              >
                S'abonner
              </button>
            </div>

            <div className="offer-card gold">
              <div className="offer-badge">GOLD</div>
              <ul className="offer-features">
                <li>3 mois d'abonnement</li>
                <li>Max 5 produits (catégories différentes)</li>
                <li>Statistiques avancées</li>
              </ul>
              <div className="offer-price">
                <span className="price">1 500 FCFA</span>
                <span className="period">/3 mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("agriculteur", "GOLD")}
              >
                S'abonner
              </button>
            </div>

            <div className="offer-card platinum">
              <div className="offer-badge">PLATINUM</div>
              <ul className="offer-features">
                <li>6 mois d'abonnement</li>
                <li>Produits illimités</li>
                <li>Analyses complètes</li>
              </ul>
              <div className="offer-price">
                <span className="price">3 000 FCFA</span>
                <span className="period">/6 mois</span>
              </div>
              <button
                className="subscribe-button"
                onClick={() => handleSubscription("agriculteur", "PLATINUM")}
              >
                S'abonner
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OffersPage;
