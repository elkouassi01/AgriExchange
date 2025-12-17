import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "./OffersPage.css";
import Footer from "./Footer";

const OffersPage = () => {
  const navigate = useNavigate();

  const handleSubscription = (type, formule) => {
    navigate(`/inscription?type=${type}&formule=${formule}`);
  };

  return (
    <div className="offers-container">
      {/* 🔶 Bande défilante promo */}
      <div className="promo-banner-scroll">
        <div className="scroll-text">
          🎉 Offre spéciale AGRICULTEURS : 6 mois d’abonnement GRATUITS jusqu’au
          31 Décembre 2025 ! 🌾
        </div>
      </div>

      <header className="offers-header">
        <h1>🎯 Nos Offres d'Abonnement</h1>
        <p className="subtitle">
          Choisissez l'abonnement qui correspond à vos besoins
        </p>
      </header>

      <div className="offers-grid">
        {/* ---------------- Consommateurs ---------------- */}
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

        {/* ---------------- Agriculteurs ---------------- */}
        <section className="offer-category">
          <div className="category-header">
            <div className="icon">🌾</div>
            <h2>Offres Agriculteurs</h2>
          </div>

          {/* 🔸 Section promotion spéciale */}
          <div className="promo-card special-offer">
            <div className="promo-badge">PROMO</div>
            <p className="promo-highlight">
              6 mois d’inscription <strong>100% gratuite</strong> !
            </p>
            <p>Valable jusqu'au 31 Décembre 2025</p>
            <Link
              to="/inscription?type=agriculteur&formule=OFFRE_GRATUITE"
              className="promo-button"
            >
              Profiter de l'offre
            </Link>
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
                <span className="old-price">500 FCFA</span>
                <span className="new-price">0 FCFA</span>
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
                <span className="old-price">1 500 FCFA</span>
                <span className="new-price">0 FCFA</span>
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
                <span className="old-price">3 000 FCFA</span>
                <span className="new-price">0 FCFA</span>
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
      <Footer />
    </div>
  );
};

export default OffersPage;
