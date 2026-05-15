import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle, Package, Users, UserCircle,
  Star, Calendar, CheckCircle, AlertCircle,
  MapPin, Sprout, TrendingUp, Zap, RefreshCw, X,
  Eye, MessageSquare, Banknote, BarChart2, ShoppingBag,
} from 'lucide-react';
import './FarmerDashboard.css';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';

const DASHBOARD_ACTIONS = [
  { path: '/ajouter-produit', Icon: PlusCircle,  text: 'Ajouter une denrée', desc: 'Publier une nouvelle offre', primary: true },
  { path: '/mes-produits',    Icon: Package,      text: 'Mes denrées',        desc: 'Gérer vos publications'       },
  { path: '/abonne',          Icon: Users,        text: 'Mes acheteurs',      desc: 'Voir vos contacts'            },
  { path: '/profil',          Icon: UserCircle,   text: 'Mon profil',         desc: 'Modifier vos informations'    },
];

const PLAN_META = {
  BLEU:     { color: '#60a5fa', bg: 'rgba(59,130,246,0.15)',  limit: '5 denrées max',   duration: '1 mois'  },
  GOLD:     { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  limit: '15 denrées max',  duration: '3 mois'  },
  PLATINUM: { color: '#c084fc', bg: 'rgba(192,132,252,0.15)', limit: 'Illimité',        duration: '6 mois'  },
};

const PLAN_CARDS = [
  { formule: 'BLEU',     color: '#60a5fa', label: 'BLEU',     duration: '+ 1 mois',  features: ['5 denrées max',  '1 catégorie',  'Stats de base']    },
  { formule: 'GOLD',     color: '#fbbf24', label: 'GOLD ⭐',  duration: '+ 3 mois',  features: ['15 denrées max', 'Multi-catégories','Stats avancées'] },
  { formule: 'PLATINUM', color: '#c084fc', label: 'PLATINUM', duration: '+ 6 mois',  features: ['Illimité',       'Toutes catégories','Analyses complètes'] },
];

const FORMULE_RANK = { BLEU: 1, GOLD: 2, PLATINUM: 3 };

const FarmerDashboard = () => {
  const { user } = useUser();
  const [productCount, setProductCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(true);

  // Stats de performance
  const [perfStats, setPerfStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Abonnement chargé depuis le backend (source de vérité pour les agriculteurs)
  const [abonnementData, setAbonnementData] = useState(null);
  const [loadingAbonnement, setLoadingAbonnement] = useState(true);

  // Modal renouvellement
  const [renewModal, setRenewModal] = useState(false);
  const [selectedFormule, setSelectedFormule] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [renewSuccess, setRenewSuccess] = useState('');

  const abonnement = abonnementData ?? user?.abonnement;
  const planMeta = abonnement?.formule ? PLAN_META[abonnement.formule] : null;

  const fetchAbonnement = useCallback(async () => {
    setLoadingAbonnement(true);
    try {
      const res = await api.get('/inscription-gratuite/mon-abonnement');
      setAbonnementData(res.data.abonnement);
    } catch {
      setAbonnementData(null);
    } finally {
      setLoadingAbonnement(false);
    }
  }, []);

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

    api.get('/products/my-stats')
      .then((res) => setPerfStats(res.data.stats || null))
      .catch(() => setPerfStats(null))
      .finally(() => setLoadingStats(false));

    fetchAbonnement();
  }, [fetchAbonnement]);

  const daysLeft = useMemo(() => {
    if (!abonnement?.dateFin) return null;
    const diff = new Date(abonnement.dateFin) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [abonnement]);

  const isActive = abonnement?.statut === 'actif' && (daysLeft === null || daysLeft > 0);

  const handleRenew = async () => {
    if (!selectedFormule) return;
    setRenewLoading(true);
    setRenewError('');
    setRenewSuccess('');
    try {
      const res = await api.post('/inscription-gratuite/renouveler', { formule: selectedFormule });
      setAbonnementData(res.data.abonnement);
      setRenewSuccess(res.data.message);
      setTimeout(() => {
        setRenewModal(false);
        setRenewSuccess('');
        setSelectedFormule(null);
      }, 2000);
    } catch (err) {
      setRenewError(err.response?.data?.message || 'Erreur lors du renouvellement.');
    } finally {
      setRenewLoading(false);
    }
  };

  // Durée totale du plan en jours pour la barre de progression
  const PLAN_DURATION_DAYS = { BLEU: 30, GOLD: 90, PLATINUM: 180 };
  const totalDays = abonnement?.formule ? PLAN_DURATION_DAYS[abonnement.formule] : 30;
  const progressPct = daysLeft !== null ? Math.min(100, Math.round((daysLeft / totalDays) * 100)) : 0;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 30;
  const isExpired = daysLeft === 0 && abonnement?.formule;
  const currentRank = abonnement?.formule ? (FORMULE_RANK[abonnement.formule] ?? 0) : 0;
  const canRenew = isExpiringSoon || isExpired;
  const canUpgrade = isActive && daysLeft > 30 && currentRank < 3;

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
            <span className="fd-stat__label">Denrées publiées</span>
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

      {/* ── Performances ── */}
      <p className="fd-section-label">
        <BarChart2 size={14} strokeWidth={2} /> Performances
      </p>

      {loadingStats ? (
        <div className="fd-perf-loading">Chargement des statistiques…</div>
      ) : perfStats ? (
        <div className="fd-perf">

          {/* KPI cards */}
          <div className="fd-perf-grid">

            <div className="fd-perf-card fd-perf-card--blue">
              <div className="fd-perf-card__icon"><Eye size={20} strokeWidth={1.8} /></div>
              <div className="fd-perf-card__body">
                <span className="fd-perf-card__value">{perfStats.views.total.toLocaleString('fr-FR')}</span>
                <span className="fd-perf-card__label">Vues denrées</span>
                <span className="fd-perf-card__sub">{perfStats.views.thisMonth} ce mois</span>
              </div>
            </div>

            <div className="fd-perf-card fd-perf-card--teal">
              <div className="fd-perf-card__icon"><MessageSquare size={20} strokeWidth={1.8} /></div>
              <div className="fd-perf-card__body">
                <span className="fd-perf-card__value">{perfStats.contacts.uniqueBuyers}</span>
                <span className="fd-perf-card__label">Acheteurs contactés</span>
                <span className="fd-perf-card__sub">via messagerie</span>
              </div>
            </div>

            <div className="fd-perf-card fd-perf-card--yellow">
              <div className="fd-perf-card__icon"><Star size={20} strokeWidth={1.8} /></div>
              <div className="fd-perf-card__body">
                <span className="fd-perf-card__value">
                  {perfStats.reviews.avgRating !== null ? `${perfStats.reviews.avgRating}/5` : '—'}
                </span>
                <span className="fd-perf-card__label">Note vendeur</span>
                <span className="fd-perf-card__sub">{perfStats.reviews.count} avis</span>
              </div>
            </div>

            <div className="fd-perf-card fd-perf-card--green">
              <div className="fd-perf-card__icon"><Banknote size={20} strokeWidth={1.8} /></div>
              <div className="fd-perf-card__body">
                <span className="fd-perf-card__value">
                  {perfStats.payments.estimatedRevenue.toLocaleString('fr-FR')} F
                </span>
                <span className="fd-perf-card__label">Revenus coordonnées</span>
                <span className="fd-perf-card__sub">{perfStats.payments.paidCount} achats</span>
              </div>
            </div>

          </div>

          {/* Résumé stock */}
          <div className="fd-stock-row">
            <div className="fd-stock-chip fd-stock-chip--good">
              <ShoppingBag size={14} />
              <span className="fd-stock-chip__val">{perfStats.products.inStock}</span>
              <span className="fd-stock-chip__label">En stock</span>
            </div>
            <div className="fd-stock-chip fd-stock-chip--bad">
              <Package size={14} />
              <span className="fd-stock-chip__val">{perfStats.products.outOfStock}</span>
              <span className="fd-stock-chip__label">Épuisés</span>
            </div>
            {perfStats.products.avgPrice > 0 && (
              <div className="fd-stock-chip">
                <Banknote size={14} />
                <span className="fd-stock-chip__val">{perfStats.products.avgPrice.toLocaleString('fr-FR')} F</span>
                <span className="fd-stock-chip__label">Prix moyen</span>
              </div>
            )}
          </div>

          {/* Répartition par catégorie */}
          {perfStats.categories.length > 0 && (
            <div className="fd-catbar">
              <p className="fd-catbar__title">Denrées par catégorie</p>
              {perfStats.categories.map((cat) => {
                const pct = perfStats.products.total > 0
                  ? Math.round((cat.count / perfStats.products.total) * 100)
                  : 0;
                return (
                  <div key={cat.categorie} className="fd-catbar__row">
                    <span className="fd-catbar__label">{cat.categorie}</span>
                    <div className="fd-catbar__track">
                      <div className="fd-catbar__fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="fd-catbar__count">{cat.count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Note en étoiles */}
          {perfStats.reviews.avgRating !== null && (
            <div className="fd-stars-row">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={18}
                  strokeWidth={1.5}
                  className={s <= Math.round(perfStats.reviews.avgRating) ? 'fd-star--filled' : 'fd-star--empty'}
                />
              ))}
              <span className="fd-stars-label">
                {perfStats.reviews.avgRating}/5 · {perfStats.reviews.count} avis client{perfStats.reviews.count > 1 ? 's' : ''}
              </span>
            </div>
          )}

        </div>
      ) : (
        <p className="fd-perf-empty">Aucune statistique disponible pour le moment.</p>
      )}

      {/* ── CTA si pas d'abonnement ── */}
      {!abonnement?.formule && !loadingAbonnement && (
        <div className="fd-cta">
          <Zap size={22} strokeWidth={1.8} className="fd-cta__icon" />
          <p className="fd-cta__text">
            Inscription <strong>100% gratuite</strong> jusqu'au 31 décembre 2026 —
            activez votre abonnement pour publier vos denrées !
          </p>
          <Link to="/offres" className="fd-cta__btn">Voir les offres</Link>
        </div>
      )}

      {/* ── Section produits sponsorisés ── */}
      {isActive && (
        <div className="fd-sponsored-section">
          <p className="fd-section-label">
            <Star size={14} strokeWidth={2} /> Denrées sponsorisées
          </p>
          <div className="fd-sponsored-grid">
            <Link to="/mes-produits" className="fd-sponsored-card">
              <Star size={28} strokeWidth={1.5} className="fd-sponsored-card__icon" />
              <span className="fd-sponsored-card__text">Gérer le sponsoring</span>
              <span className="fd-sponsored-card__desc">Mettez en avant vos denrées</span>
              <span className="fd-sponsored-card__link">Voir mes denrées →</span>
            </Link>
            <div className="fd-sponsored-info">
              <p className="fd-sponsored-info__title">Pourquoi sponsoriser ?</p>
              <ul className="fd-sponsored-info__list">
                <li>Plus de visibilité sur le marché</li>
                <li>Atteindre plus d'acheteurs potentiels</li>
                <li>Augmenter vos ventes rapidement</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Section renouvellement ── */}
      {abonnement?.formule && (
        <div className={`fd-renew-card ${isExpired ? 'fd-renew-card--expired' : isExpiringSoon ? 'fd-renew-card--warning' : ''}`}>
          <div className="fd-renew-card__top">
            <div className="fd-renew-card__info">
              <RefreshCw size={18} strokeWidth={2} className="fd-renew-card__icon" />
              <div>
                <p className="fd-renew-card__title">
                  {isExpired
                    ? 'Votre abonnement a expiré'
                    : isExpiringSoon
                      ? `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
                      : `Abonnement ${abonnement.formule} actif`}
                </p>
                <p className="fd-renew-card__sub">
                  {abonnement.dateFin
                    ? `Date de fin : ${new Date(abonnement.dateFin).toLocaleDateString('fr-FR')}`
                    : ''}
                </p>
              </div>
            </div>
            {(canRenew || canUpgrade) ? (
              <button
                className={`fd-renew-card__btn ${canUpgrade && !canRenew ? 'fd-renew-card__btn--upgrade' : ''}`}
                onClick={() => {
                  setRenewModal(true);
                  setSelectedFormule(canUpgrade && !canRenew ? null : abonnement.formule);
                  setRenewError('');
                  setRenewSuccess('');
                }}
              >
                {canUpgrade && !canRenew ? 'Upgrader' : 'Renouveler'}
              </button>
            ) : (
              <span className="fd-renew-card__badge-active">Actif</span>
            )}
          </div>

          {/* Barre de progression */}
          <div className="fd-progress-bar">
            <div
              className="fd-progress-bar__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="fd-progress-label">
            {daysLeft !== null ? `${daysLeft} / ${totalDays} jours restants` : ''}
          </p>
        </div>
      )}

      {/* ── Modal renouvellement ── */}
      {renewModal && (
        <div className="fd-modal-overlay" onClick={() => setRenewModal(false)}>
          <div className="fd-modal" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const upgradeOnly = canUpgrade && !canRenew;
              const visiblePlans = upgradeOnly
                ? PLAN_CARDS.filter((p) => (FORMULE_RANK[p.formule] ?? 0) > currentRank)
                : PLAN_CARDS;
              return (
                <>
                  <div className="fd-modal__header">
                    <h2>{upgradeOnly ? 'Upgrader votre formule' : 'Renouveler votre abonnement'}</h2>
                    <button className="fd-modal__close" onClick={() => setRenewModal(false)}>
                      <X size={20} />
                    </button>
                  </div>

                  <p className="fd-modal__sub">
                    {upgradeOnly
                      ? `Votre nouveau plan démarre aujourd'hui. Les jours restants sur votre plan ${abonnement.formule} ne sont pas remboursés.`
                      : `Votre abonnement sera prolongé à partir de${
                          abonnement?.dateFin && new Date(abonnement.dateFin) > new Date()
                            ? ` la date de fin actuelle (${new Date(abonnement.dateFin).toLocaleDateString('fr-FR')})`
                            : " aujourd'hui"
                        }.`}
                  </p>

                  <div className="fd-plan-grid">
                    {visiblePlans.map((plan) => (
                      <button
                        key={plan.formule}
                        className={`fd-plan-option ${selectedFormule === plan.formule ? 'fd-plan-option--selected' : ''}`}
                        style={selectedFormule === plan.formule ? { borderColor: plan.color, boxShadow: `0 0 0 2px ${plan.color}40` } : {}}
                        onClick={() => setSelectedFormule(plan.formule)}
                      >
                        <span className="fd-plan-option__label" style={{ color: plan.color }}>{plan.label}</span>
                        <span className="fd-plan-option__duration">{plan.duration}</span>
                        <ul className="fd-plan-option__features">
                          {plan.features.map((f) => <li key={f}>{f}</li>)}
                        </ul>
                        <span className="fd-plan-option__price">GRATUIT</span>
                      </button>
                    ))}
                  </div>

                  {renewError && <p className="fd-modal__error">{renewError}</p>}
                  {renewSuccess && <p className="fd-modal__success">{renewSuccess}</p>}

                  <button
                    className="fd-modal__confirm"
                    onClick={handleRenew}
                    disabled={!selectedFormule || renewLoading}
                  >
                    {renewLoading
                      ? (upgradeOnly ? 'Upgrade en cours...' : 'Renouvellement...')
                      : (upgradeOnly ? `Upgrader — ${selectedFormule || '…'}` : `Confirmer — ${selectedFormule || '…'}`)}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(FarmerDashboard);
