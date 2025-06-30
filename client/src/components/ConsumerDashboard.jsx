import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Heart,
  User,
  ScrollText,
  Eye,
  AlertCircle,
  Timer
} from "lucide-react";

import { useUser } from "../contexts/UserContext"; 
import "./ConsumerDashboard.css";

const ConsumerDashboard = () => {
  const { user, loading } = useUser();

  const abonnement = user?.vuesDetails;
  const actif = user?.abonnementActif;

  return (
    <main className="dashboard-container" aria-live="polite" aria-busy={loading}>
      <h1>Bienvenue dans votre espace Consommateur</h1>

      {loading && (
        <section className="loading-state">
          <div className="spinner" aria-hidden="true"></div>
          <p>Chargement des informations...</p>
        </section>
      )}

      {!loading && !user && (
        <section className="error-message">
          <AlertCircle size={24} color="#c62828" />
          <p>Erreur : vous devez être connecté pour voir ce tableau de bord.</p>
          <Link to="/login" className="retry-button">Se connecter</Link>
        </section>
      )}

      {!loading && user && (
        <>
          {abonnement ? (
            <section className="forfait-info">
              <Eye size={24} color="#2e7d32" />
              <p>
                Vues restantes : <strong>{abonnement.quotaRestant}</strong>
              </p>
              {abonnement.quotaRestant <= 3 && (
                <p className="warning-message" role="alert">
                  ⚠️ Attention, vous approchez de la limite de votre forfait.
                </p>
              )}
            </section>
          ) : actif === false ? (
            <section className="forfait-expired" role="alert">
              <Timer size={24} color="#ef6c00" />
              <p>Votre forfait est expiré. Merci de le renouveler.</p>
              <Link to="/offres" className="renew-button">
                Renouveler mon forfait
              </Link>
            </section>
          ) : (
            <section className="no-forfait">
              <p>Vous n'avez pas encore souscrit à un forfait.</p>
              <Link to="/offres" className="subscribe-button">
                Voir les offres
              </Link>
            </section>
          )}

          <section className="dashboard-actions">
            <Link to="/produits" className="dashboard-link">
              <ShoppingCart size={24} />
              Parcourir les produits
            </Link>
            <Link to="/favoris" className="dashboard-link">
              <Heart size={24} />
              Voir mes favoris
            </Link>
            <Link to="/profil-consommateur" className="dashboard-link">
              <User size={24} />
              Mon profil
            </Link>
            <Link to="/historique-commande" className="dashboard-link">
              <ScrollText size={24} />
              Historique Achats
            </Link>
          </section>
        </>
      )}
    </main>
  );
};

export default ConsumerDashboard;
