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
  const [abonnementData, setAbonnementData] = useState(null);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [viewsUsed, setViewsUsed] = useState(0);

  // Définir les quotas de vues par formule
  const FORMULE_QUOTAS = {
    BLEU: 1,
    GOLD: 5,
    PLATINUM: Infinity  // Illimité
  };

  /**
   * 🔁 Récupère les infos d'abonnement à partir de l'ID utilisateur
   */
  const fetchAbonnement = useCallback(async () => {
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
      console.log("✅ Données abonnement :", data);

      // Vérifier si l'abonnement est présent
      if (!data.abonnement || !data.abonnement.statut) {
        setExpired(false);
        setAbonnementData(null);
        return;
      }

      // Vérifier si l'abonnement est actif et non expiré
      const today = new Date();
      const endDate = new Date(data.abonnement.dateFin);
      const isActive = data.abonnement.statut === "actif";
      
      // Calculer les jours restants (même si expiré)
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysRemaining(diffDays > 0 ? diffDays : 0);
      
      // Calculer les vues utilisées
      const viewsCount = data.productViews?.length || 0;
      setViewsUsed(viewsCount);
      
      // Déterminer le quota en fonction de la formule
      const formule = data.abonnement.formule;
      const quota = FORMULE_QUOTAS[formule] || 0;
      
      // Calculer les vues restantes (sauf pour PLATINUM qui est illimité)
      const remainingViews = formule === "PLATINUM" 
        ? Infinity 
        : Math.max(0, quota - viewsCount);

      // Vérifier l'expiration
      const isExpired = endDate < today;
      setExpired(isExpired);

      // Toujours mettre à jour les données d'abonnement
      setAbonnementData({
        formule,
        dateFin: data.abonnement.dateFin,
        montant: data.abonnement.montant,
        quotaTotal: quota,
        quotaRestant: remainingViews,
        statut: data.abonnement.statut
      });

    } catch (err) {
      console.error("❌ Erreur récupération abonnement :", err);
      setError("Impossible de récupérer les informations de votre abonnement.");
      setAbonnementData(null);
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
      fetchAbonnement();
    }
  }, [fetchAbonnement, userLoading, user]);

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

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return "Non spécifiée";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  // Formater le montant
  const formatMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  // Obtenir le nom affichable de la formule
  const getFormuleDisplayName = (formule) => {
    const noms = {
      BLEU: "Bleu",
      GOLD: "Gold",
      PLATINUM: "Platinum"
    };
    return noms[formule] || formule;
  };

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
          <p>Chargement des informations de votre abonnement...</p>
        </section>
      )}

      {!loading && error && (
        <section className="error-message" role="alert" aria-live="assertive">
          <AlertCircle size={24} color="#c62828" />
          <p>{error}</p>
          <button className="retry-button" onClick={fetchAbonnement} aria-label="Réessayer">
            <RefreshCw size={18} /> Réessayer
          </button>
        </section>
      )}

      {!loading && !error && abonnementData && (
        <div className="abonnement-container">
          <section className="abonnement-info" aria-label="Statut de l'abonnement">
            <div className="abonnement-header">
              <Eye size={32} color={expired ? "#ef6c00" : "#2e7d32"} />
              <h2>Votre abonnement {getFormuleDisplayName(abonnementData.formule)}</h2>
              <span className={`status-badge ${abonnementData.statut === "actif" && !expired ? "active" : "inactive"}`}>
                {abonnementData.statut === "actif" && !expired ? "Actif" : expired ? "Expiré" : "Inactif"}
              </span>
            </div>
            
            <div className="abonnement-stats">
              <div className="stat-card">
                <h3>Vues utilisées</h3>
                {abonnementData.formule === "PLATINUM" ? (
                  <p className="stat-value">{viewsUsed} (Illimité)</p>
                ) : (
                  <>
                    <p className="stat-value">{viewsUsed} / {abonnementData.quotaTotal}</p>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${Math.min(100, (viewsUsed / abonnementData.quotaTotal) * 100)}%` }}
                      ></div>
                    </div>
                    {abonnementData.quotaRestant <= (abonnementData.quotaTotal * 0.2) && abonnementData.quotaRestant > 0 && (
                      <p className="warning-message" role="alert">
                        ⚠️ Il vous reste {abonnementData.quotaRestant} vue{abonnementData.quotaRestant > 1 ? 's' : ''}
                      </p>
                    )}
                    {abonnementData.quotaRestant === 0 && (
                      <p className="error-message" role="alert">
                        ❌ Vous avez épuisé vos vues
                      </p>
                    )}
                  </>
                )}
              </div>
              
              <div className="stat-card">
                <h3>Date d'expiration</h3>
                <p className="stat-value">{formatDate(abonnementData.dateFin)}</p>
                {!expired && daysRemaining > 0 && daysRemaining <= 7 && (
                  <p className="warning-message" role="alert">
                    ⚠️ Expire dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}
                  </p>
                )}
                {expired && (
                  <p className="error-message" role="alert">
                    ❌ Expiré
                  </p>
                )}
              </div>
              
              <div className="stat-card">
                <h3>Montant</h3>
                <p className="stat-value">{formatMontant(abonnementData.montant)}</p>
                <p className="stat-note">Abonnement {getFormuleDisplayName(abonnementData.formule)}</p>
              </div>
            </div>
          </section>
          
          <div className="abonnement-actions">
            {expired ? (
              <Link to="/offres" className="renew-button">
                Renouveler mon abonnement
              </Link>
            ) : (
              <Link to="/offres" className="upgrade-button">
                Modifier mon abonnement
              </Link>
            )}
          </div>
        </div>
      )}

      {!loading && !error && !abonnementData && !expired && (
        <section className="no-abonnement">
          <div className="no-abonnement-header">
            <AlertCircle size={32} color="#1976d2" />
            <h2>Aucun abonnement actif</h2>
          </div>
          <p>Vous n'avez pas encore souscrit à un abonnement.</p>
          <p>Souscrivez à un abonnement pour accéder aux contacts des producteurs.</p>
          <Link to="/offres" className="subscribe-button">
            Voir les offres disponibles
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