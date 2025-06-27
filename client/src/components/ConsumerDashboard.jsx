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

import { useUser } from "../contexts/UserContext";  // supposé exister

const ConsumerDashboard = () => {
  const { user } = useUser();  // récupère l'utilisateur connecté
  const [forfaitData, setForfaitData] = useState(null);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchForfait = useCallback(async () => {
    if (!user || !user._id) {
      setError("Utilisateur non authentifié");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Utiliser la route existante qui renvoie le forfait de l'utilisateur
      const res = await axios.get(`/api/v1/users/${user._id}/forfait`, {
        withCredentials: true,
      });

      // Exemple de réponse attendue :
      // { formule: "BLEU", abonnementActif: true, vuesDetails: { quotaRestant: 2, produitsVus: [...] } }

      const data = res.data;

      if (!data.abonnementActif) {
        setExpired(true);
        setForfaitData(null);
      } else {
        setExpired(false);
        setForfaitData(data.vuesDetails || null);
      }
    } catch (err) {
      setError("Impossible de récupérer les informations du forfait.");
      setForfaitData(null);
      setExpired(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchForfait();
  }, [fetchForfait]);

  return (
    <main className="dashboard-container" aria-live="polite" aria-busy={loading}>
      <h1>Bienvenue dans votre espace Consommateur</h1>

      {loading && (
        <section className="loading-state" aria-label="Chargement des données">
          <div className="spinner" aria-hidden="true"></div>
          <p>Chargement des informations...</p>
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
        <>
          <section className="forfait-info" aria-label="Statut du forfait">
            <Eye size={24} color="#2e7d32" />
            <p>
              Vues restantes : <strong>{forfaitData.quotaRestant}</strong>
            </p>
            {forfaitData.quotaRestant <= 3 && (
              <p className="warning-message" role="alert" aria-live="assertive">
                ⚠️ Attention, vous approchez de la limite de votre forfait. Pensez à le renouveler.
              </p>
            )}
          </section>
        </>
      )}

      {!loading && !error && expired && (
        <section className="forfait-expired" role="alert" aria-live="assertive">
          <Timer size={24} color="#ef6c00" />
          <p>Votre forfait est expiré. Merci de le renouveler pour continuer à accéder aux contacts.</p>
          <Link to="/offres" className="renew-button" aria-label="Renouveler mon forfait">
            Renouveler mon forfait
          </Link>
        </section>
      )}

      {!loading && !error && !forfaitData && !expired && (
        <section className="no-forfait" aria-live="polite">
          <p>Vous n'avez pas encore souscrit à un forfait.</p>
          <Link to="/offres" className="subscribe-button" aria-label="Souscrire à un forfait">
            Voir les offres
          </Link>
        </section>
      )}

      <section className="dashboard-actions" aria-label="Actions principales du tableau de bord">
        <Link to="/produits" className="dashboard-link" aria-label="Parcourir les produits">
          <ShoppingCart size={24} />
          Parcourir les produits
        </Link>
        <Link to="/favoris" className="dashboard-link" aria-label="Voir mes favoris">
          <Heart size={24} />
          Voir mes favoris
        </Link>
        <Link to="/profil-consommateur" className="dashboard-link" aria-label="Mon profil">
          <User size={24} />
          Mon profil
        </Link>
        <Link to="/historique-commande" className="dashboard-link" aria-label="Historique des achats">
          <ScrollText size={24} color="#2e7d32" />
          Historique Achats
        </Link>
      </section>
    </main>
  );
};

export default ConsumerDashboard;
