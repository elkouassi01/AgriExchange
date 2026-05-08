import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, Package, Users, UserCircle,
  Star, Calendar, CheckCircle, AlertCircle,
  MapPin, Sprout, TrendingUp, Zap,
} from 'lucide-react';
import './FarmerDashboard.css';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';

const DASHBOARD_ACTIONS = [
  { path: '/ajouter-produit', Icon: PlusCircle,  text: 'Ajouter un produit', desc: 'Publier une nouvelle offre'    },
  { path: '/mes-produits',    Icon: Package,      text: 'Mes produits',       desc: 'Gérer vos publications'       },
  { path: '/abonne',          Icon: Users,        text: 'Mes acheteurs',      desc: 'Voir vos contacts'            },
  { path: '/profil',          Icon: UserCircle,   text: 'Mon profil',         desc: 'Modifier vos informations'    },
];

const PLAN_META = {
  BLEU:     { color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  limit: '5 produits max',  duration: '1 mois'  },
  GOLD:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  limit: '15 produits max', duration: '3 mois'  },
  PLATINUM: { color: '#c084fc', bg: 'rgba(192,132,252,0.15)', limit: 'Illimité',        duration: '6 mois'  },
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

  return (
    <div className="fd-container" role="main">

      {/* ── Header ── */}
      <div className="fd-header">
        <div className="fd-header__left">
          <div className="fd-header__icon-wrap">
            <Sprout size={28} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="fd-greeting">
              Bonjour, <span className="fd-greeting__name">{user?.nom || 'Agriculteur'}</span>
            </h1>
            <div className="fd-header__meta">
              {user?.fermeNom && (
                <span className="fd-meta-chip">
                  <Sprout size={13} /> {user.fermeNom}
                </span>
              )}
              {user?.localisation && (
                <span className="fd-meta-chip">
                  <MapPin size={13} /> {user.localisation}
                </span>
              )}
            </div>
            <p className="fd-header__date">{today}</p>
          </div>
        </div>

        {planMeta && (
          <div className="fd-plan-badge" style={{ color: planMeta.color, background: planMeta.bg, borderColor: planMeta.color }}>
            <Star size={14} strokeWidth={2} />
            <span>{abonnement.formule}</span>
            <span className="fd-plan-badge__sub">{planMeta.duration}</span>
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="fd-stats">

        <div className="fd-stat">
          <div className="fd-stat__icon-wrap fd-stat__icon-wrap--blue">
            <Package size={20} strokeWidth={1.8} />
          </div>
          <div className="fd-stat__body">
            <span className="fd-stat__value">
              {loadingCount ? '…' : productCount ?? '—'}
            </span>
            <span className="fd-stat__label">Produits publiés</span>
          </div>
        </div>

        <div className="fd-stat">
          <div className="fd-stat__icon-wrap fd-stat__icon-wrap--yellow">
            <Star size={20} strokeWidth={1.8} />
          </div>
          <div className="fd-stat__body">
            <span className="fd-stat__value" style={planMeta ? { color: planMeta.color } : {}}>
              {abonnement?.formule || '—'}
            </span>
            <span className="fd-stat__label">
              {planMeta ? planMeta.limit : 'Aucun plan actif'}
            </span>
          </div>
        </div>

        <div className="fd-stat">
          <div className="fd-stat__icon-wrap fd-stat__icon-wrap--teal">
            <Calendar size={20} strokeWidth={1.8} />
          </div>
          <div className="fd-stat__body">
            <span className="fd-stat__value">
              {daysLeft !== null ? `${daysLeft} j` : '—'}
            </span>
            <span className="fd-stat__label">
              {abonnement?.dateFin
                ? `Exp. ${new Date(abonnement.dateFin).toLocaleDateString('fr-FR')}`
                : 'Abonnement inactif'}
            </span>
          </div>
        </div>

        <div className="fd-stat">
          <div className={`fd-stat__icon-wrap ${isActive ? 'fd-stat__icon-wrap--green' : 'fd-stat__icon-wrap--orange'}`}>
            {isActive
              ? <CheckCircle size={20} strokeWidth={1.8} />
              : <AlertCircle size={20} strokeWidth={1.8} />}
          </div>
          <div className="fd-stat__body">
            <span className={`fd-stat__value ${isActive ? 'fd-stat__value--active' : 'fd-stat__value--inactive'}`}>
              {isActive ? 'Actif' : 'Inactif'}
            </span>
            <span className="fd-stat__label">Statut abonnement</span>
          </div>
        </div>

      </div>

      {/* ── Actions ── */}
      <p className="fd-section-label">
        <TrendingUp size={14} strokeWidth={2} /> Actions rapides
      </p>
      <nav className="fd-actions" aria-label="Navigation principale">
        {DASHBOARD_ACTIONS.map(({ path, Icon, text, desc }, i) => (
          <Link
            key={path}
            to={path}
            className="fd-action-card"
            aria-label={text}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div className="fd-action-card__icon">
              <Icon size={32} strokeWidth={1.5} />
            </div>
            <span className="fd-action-card__text">{text}</span>
            <span className="fd-action-card__desc">{desc}</span>
          </Link>
        ))}
      </nav>

      {/* ── CTA si pas d'abonnement ── */}
      {!abonnement?.formule && (
        <div className="fd-cta">
          <Zap size={22} strokeWidth={1.8} className="fd-cta__icon" />
          <p className="fd-cta__text">
            Inscription <strong>100% gratuite</strong> jusqu'au 31 décembre 2026 —
            activez votre abonnement pour publier vos produits !
          </p>
          <Link to="/offres" className="fd-cta__btn">Voir les offres</Link>
        </div>
      )}

    </div>
  );
};

export default React.memo(FarmerDashboard);
