import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './FarmerDashboard.css';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';

const DASHBOARD_ACTIONS = [
  { path: '/ajouter-produit', icon: '➕', text: 'Ajouter un produit',  desc: 'Publier une nouvelle offre' },
  { path: '/mes-produits',    icon: '📦', text: 'Mes produits',        desc: 'Gérer vos publications' },
  { path: '/abonne',          icon: '👥', text: 'Mes acheteurs',       desc: 'Voir vos contacts' },
  { path: '/profil',          icon: '👤', text: 'Mon profil',          desc: 'Modifier vos informations' },
];

const PLAN_META = {
  BLEU:     { color: '#3498db', limit: '5 produits max',   duration: '1 mois' },
  GOLD:     { color: '#e67e22', limit: '15 produits max',  duration: '3 mois' },
  PLATINUM: { color: '#8e44ad', limit: 'Illimité',         duration: '6 mois' },
};

const FarmerDashboard = () => {
  const { user } = useUser();
  const [productCount, setProductCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(true);

  const abonnement = user?.abonnement;
  const planMeta = abonnement?.formule ? PLAN_META[abonnement.formule] : null;

  useEffect(() => {
    api.get('/products/my-products?limit=1&page=1')
      .then((res) => {
        const total =
          res.data?.data?.pagination?.totalProducts ??
          res.data?.pagination?.totalProducts ??
          null;
        setProductCount(total);
      })
      .catch(() => setProductCount(null))
      .finally(() => setLoadingCount(false));
  }, []);

  const daysLeft = useMemo(() => {
    if (!abonnement?.dateFin) return null;
    const diff = new Date(abonnement.dateFin) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [abonnement]);

  const isActive = abonnement?.statut === 'actif' && (daysLeft === null || daysLeft > 0);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const actionLinks = useMemo(
    () =>
      DASHBOARD_ACTIONS.map(({ path, icon, text, desc }) => (
        <Link key={path} to={path} className="dashboard-link" aria-label={text}>
          <span className="dashboard-icon">{icon}</span>
          <span className="dashboard-text">{text}</span>
          <span className="dashboard-desc">{desc}</span>
        </Link>
      )),
    []
  );

  return (
    <div className="dashboard-container" role="main">

      {/* ── Header ── */}
      <div className="dashboard-header">
        <div className="dashboard-header__left">
          <h1 className="dashboard-greeting">
            Bonjour,&nbsp;
            <span className="dashboard-greeting__name">{user?.nom || 'Agriculteur'}</span>
            &nbsp;👋
          </h1>
          {user?.fermeNom && (
            <p className="dashboard-header__farm">🌾 {user.fermeNom}</p>
          )}
          {user?.localisation && (
            <p className="dashboard-header__location">📍 {user.localisation}</p>
          )}
          <p className="dashboard-header__date">{today}</p>
        </div>

        {planMeta && (
          <div className="dashboard-plan-badge" style={{ borderColor: planMeta.color, color: planMeta.color }}>
            <span className="dashboard-plan-badge__formule">{abonnement.formule}</span>
            <span className="dashboard-plan-badge__duration">{planMeta.duration}</span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-card__icon">📦</span>
          <div className="stat-card__body">
            <span className="stat-card__value">
              {loadingCount ? '…' : productCount !== null ? productCount : '—'}
            </span>
            <span className="stat-card__label">Produits publiés</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">⭐</span>
          <div className="stat-card__body">
            <span
              className="stat-card__value"
              style={{ color: planMeta?.color || '#00ff9d' }}
            >
              {abonnement?.formule || '—'}
            </span>
            <span className="stat-card__label">
              {planMeta ? planMeta.limit : 'Aucun plan actif'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">📅</span>
          <div className="stat-card__body">
            <span className="stat-card__value">
              {daysLeft !== null ? `${daysLeft} j` : '—'}
            </span>
            <span className="stat-card__label">
              {abonnement?.dateFin
                ? `Expire le ${new Date(abonnement.dateFin).toLocaleDateString('fr-FR')}`
                : 'Abonnement inactif'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">{isActive ? '✅' : '⚠️'}</span>
          <div className="stat-card__body">
            <span className={`stat-card__value stat-card__value--${isActive ? 'active' : 'inactive'}`}>
              {isActive ? 'Actif' : 'Inactif'}
            </span>
            <span className="stat-card__label">Statut abonnement</span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <p className="dashboard-section-title">Actions rapides</p>
      <nav className="dashboard-actions" aria-label="Navigation principale">
        {actionLinks}
      </nav>

      {/* ── CTA si pas d'abonnement ── */}
      {!abonnement?.formule && (
        <div className="dashboard-cta">
          <span className="dashboard-cta__icon">🎉</span>
          <p className="dashboard-cta__text">
            Inscription <strong>100% gratuite</strong> jusqu'au 31 décembre 2026 —
            activez votre abonnement pour publier vos produits !
          </p>
          <Link to="/offres" className="dashboard-cta__btn">Voir les offres</Link>
        </div>
      )}
    </div>
  );
};

export default React.memo(FarmerDashboard);
