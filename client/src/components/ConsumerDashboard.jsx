import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./ConsumerDashboard.css";
import {
  ShoppingCart,
  Heart,
  User,
  ScrollText,
  Eye,
  AlertCircle,
  Timer,
  RefreshCw
} from "lucide-react";

import { useUser } from "../contexts/UserContext";

const ConsumerDashboard = () => {
  const { user, loading: userLoading } = useUser();
  const [forfaitData, setForfaitData] = useState(null);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * 🔁 Récupère les infos de forfait à partir de l'ID utilisateur
   */
  const fetchForfait = useCallback(async () => {
    if (!user || !user._id) {
      console.warn("❌ Aucun utilisateur authentifié !");
      setError("Utilisateur non authentifié");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`/api/v1/users/${user._id}/forfait`, {
        withCredentials: true,
      });

      const data = res.data;
      console.log("✅ Données forfait :", data);

      if (!data.abonnementActif) {
        setExpired(true);
        setForfaitData(null);
      } else {
        setExpired(false);
        setForfaitData(data.vuesDetails || null);
      }
    } catch (err) {
      console.error("❌ Erreur récupération forfait :", err.message);
      setError("Impossible de récupérer les informations du forfait.");
      setForfaitData(null);
      setExpired(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * ▶️ Déclenche le chargement après que le user soit dispo
   */
  useEffect(() => {
    if (!userLoading && user && user._id) {
      fetchForfait();
    }
  }, [fetchForfait, userLoading, user]);

  /**
   * 🔃 Affichage tant que user en attente
   */
  if (userLoading) {
    return (
      <main className="dashboard-container">
        <div className="spinner"></div>
        <p>Chargement du profil utilisateur...</p>
      </main>
    );
  }

  /**
   * 🧑‍💼 Rendu principal du tableau de bord consommateur
   */
  return (
    <main className="dashboard-container" aria-live="polite" aria-busy={loading}>
      <h1>
        Bienvenue, <span className="user-name">{user?.prenom || user?.nom || "Utilisateur"}</span>
      </h1>

      {loading && (
        <section className="loading-state" aria-label="Chargement des données">
          <div className="spinner" aria-hidden="true"></div>
          <p>Chargement des informations de votre forfait...</p>
        </section>
      )}

      {!loading && error && (
        <section className="error-message" role="alert" aria-live="assertive">
          <AlertCircle size={24} color="#c62828" />
          <p>{error}</p>
          <button className="retry-button" onClick={fetchForfait} aria-label="Réessayer">
            <RefreshCw size={18} /> Réessayer
          </button>
        </section>
      )}

      {!loading && !error && forfaitData && (
        <section className="forfait-info" aria-label="Statut du forfait">
          <Eye size={24} color="#2e7d32" />
          <p>
            Vues restantes : <strong>{forfaitData.quotaRestant}</strong>
          </p>
          {forfaitData.quotaRestant <= 3 && (
            <p className="warning-message" role="alert">
              ⚠️ Vous approchez de la limite de votre forfait.
            </p>
          )}
        </section>
      )}

      {!loading && !error && expired && (
        <section className="forfait-expired" role="alert">
          <Timer size={24} color="#ef6c00" />
          <p>
            Votre forfait est expiré. Merci de le renouveler pour continuer à accéder aux contacts.
          </p>
          <Link to="/offres" className="renew-button">
            Renouveler mon forfait
          </Link>
        </section>
      )}

      {!loading && !error && !forfaitData && !expired && (
        <section className="no-forfait">
          <p>Vous n'avez pas encore souscrit à un forfait.</p>
          <Link to="/offres" className="subscribe-button">
            Voir les offres
          </Link>
        </section>
      )}

      <section className="dashboard-actions" aria-label="Actions principales du tableau de bord">
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
    </main>
  );
};

export default ConsumerDashboard;
