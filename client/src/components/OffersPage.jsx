import React from "react";
import { useNavigate, Link } from "react-router-dom";
import "./OffersPage.css";
import Footer from "./Footer";

const promoFin = new Date("2026-04-01");

const OffersPage = () => {
  const navigate = useNavigate();

  const handleSubscription = (type, formule) => {
    navigate(`/inscription?type=${type}&formule=${formule}`);
  };

  const isPromoActive = new Date() < promoFin;

  return (
    <div className="offers-container">

      {/* Bande défilante */}
      <div className="promo-banner-scroll">
        <div className="scroll-text">
          🌾 Parcourez tous les produits gratuitement — Contactez un vendeur pour seulement 300 FCFA &nbsp;|&nbsp;
          🎉 Agriculteurs : inscrivez-vous gratuitement et publiez vos produits dès aujourd'hui !
        </div>
      </div>

      {/* Hero */}
      <header className="offers-header">
        <h1>Comment fonctionne VivriMarket ?</h1>
        <p className="subtitle">
          Une plateforme simple, directe et sans abonnement pour les acheteurs
        </p>
      </header>

      {/* ---- Comment ça marche ---- */}
      <section className="how-it-works">
        <div className="hiw-step">
          <div className="hiw-icon">🔍</div>
          <h3>Parcourez gratuitement</h3>
          <p>Accédez à tous nos produits, photos, prix et descriptions sans créer de compte.</p>
        </div>
        <div className="hiw-arrow">→</div>
        <div className="hiw-step">
          <div className="hiw-icon">🔒</div>
          <h3>Débloquez les coordonnées</h3>
          <p>Payez <strong>300 FCFA</strong> pour obtenir les contacts complets d'un vendeur.</p>
        </div>
        <div className="hiw-arrow">→</div>
        <div className="hiw-step">
          <div className="hiw-icon">📞</div>
          <h3>Contactez directement</h3>
          <p>Appelez ou écrivez au vendeur sans intermédiaire. Négociez librement.</p>
        </div>
      </section>

      {/* ---- Tarif acheteur ---- */}
      <section className="buyer-section">
        <div className="section-label">Pour les acheteurs &amp; visiteurs</div>
        <div className="buyer-card">
          <div className="buyer-price-block">
            <span className="buyer-price">300 FCFA</span>
            <span className="buyer-per">/ coordonnées vendeur</span>
          </div>
          <ul className="buyer-features">
            <li>Sans création de compte</li>
            <li>Paiement sécurisé via CinetPay</li>
            <li>Mobile Money (Orange, MTN, Wave…)</li>
            <li>Accès immédiat après paiement</li>
            <li>Valable sur le produit consulté</li>
          </ul>
          <button className="browse-button" onClick={() => navigate("/produits")}>
            Parcourir les produits
          </button>
        </div>
      </section>

      {/* ---- Section Agriculteurs ---- */}
      <section className="offer-category farmer-section">
        <div className="category-header">
          <div className="icon">🌾</div>
          <h2>Offres Agriculteurs — Publiez vos produits</h2>
        </div>

        {isPromoActive && (
          <div className="promo-card special-offer">
            <div className="promo-badge">PROMO</div>
            <p className="promo-highlight">
              Inscription <strong>100% gratuite</strong> jusqu'au {promoFin.toLocaleDateString("fr-FR")} !
            </p>
            <p style={{ color: "#fff", marginBottom: "1rem" }}>
              Publiez vos produits et recevez des acheteurs sans frais d'inscription.
            </p>
            <Link to="/inscription?type=agriculteur&formule=OFFRE_GRATUITE" className="promo-button">
              Profiter de l'offre gratuite
            </Link>
          </div>
        )}

        <div className="offer-cards">
          <div className="offer-card blue">
            <div className="offer-badge">BLEU</div>
            <ul className="offer-features">
              <li>1 mois d'accès</li>
              <li>Jusqu'à 2 produits publiés</li>
              <li>Même catégorie</li>
              <li>Statistiques de base</li>
            </ul>
            <div className="offer-price">
              <span className="price">500 FCFA</span>
              <span className="period">/mois</span>
            </div>
            <button className="subscribe-button" onClick={() => handleSubscription("agriculteur", "BLEU")}>
              Choisir BLEU
            </button>
          </div>

          <div className="offer-card gold">
            <div className="offer-badge popular-tag">GOLD ⭐ Populaire</div>
            <ul className="offer-features">
              <li>3 mois d'accès</li>
              <li>Jusqu'à 5 produits publiés</li>
              <li>Catégories multiples</li>
              <li>Statistiques avancées</li>
            </ul>
            <div className="offer-price">
              <span className="price">1 500 FCFA</span>
              <span className="period">/3 mois</span>
            </div>
            <button className="subscribe-button" onClick={() => handleSubscription("agriculteur", "GOLD")}>
              Choisir GOLD
            </button>
          </div>

          <div className="offer-card platinum">
            <div className="offer-badge">PLATINUM</div>
            <ul className="offer-features">
              <li>6 mois d'accès</li>
              <li>Produits illimités</li>
              <li>Toutes catégories</li>
              <li>Analyses complètes</li>
            </ul>
            <div className="offer-price">
              <span className="price">3 000 FCFA</span>
              <span className="period">/6 mois</span>
            </div>
            <button className="subscribe-button" onClick={() => handleSubscription("agriculteur", "PLATINUM")}>
              Choisir PLATINUM
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default OffersPage;
