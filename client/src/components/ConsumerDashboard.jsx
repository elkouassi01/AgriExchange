import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Phone, User, TrendingUp,
  CheckCircle, Clock, XCircle, RefreshCw,
  MapPin, ShoppingCart,
} from 'lucide-react';
import './ConsumerDashboard.css';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';

const STATUS_META = {
  pending:   { label: 'En attente',  icon: Clock,        cls: 'status--pending'   },
  responded: { label: 'Répondu',     icon: CheckCircle,  cls: 'status--responded' },
  expired:   { label: 'Expiré',      icon: XCircle,      cls: 'status--expired'   },
  refunded:  { label: 'Remboursé',   icon: RefreshCw,    cls: 'status--refunded'  },
};

const fmtPrice = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`;

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ConsumerDashboard = () => {
  const { user, loading: userLoading } = useUser();
  const [contacts, setContacts]   = useState([]);
  const [stats, setStats]         = useState({ total: 0, actifs: 0, depense: 0 });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/auth/mes-contacts');
      setContacts(res.data.contacts || []);
      setStats(res.data.stats   || { total: 0, actifs: 0, depense: 0 });
    } catch {
      setError('Impossible de charger vos contacts débloqués.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) fetchContacts();
  }, [fetchContacts, userLoading, user]);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (userLoading) {
    return (
      <div className="cd-container">
        <div className="cd-spinner" />
      </div>
    );
  }

  return (
    <div className="cd-container" role="main">

      {/* ── Header ── */}
      <div className="cd-header">
        <div className="cd-header__left">
          <div className="cd-header__icon">
            <ShoppingBag size={26} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="cd-greeting">
              Bonjour, <span className="cd-greeting__name">{user?.nom || 'Acheteur'}</span>
            </h1>
            <div className="cd-header__meta">
              {user?.localisation && (
                <span className="cd-meta-chip">
                  <MapPin size={12} /> {user.localisation}
                </span>
              )}
            </div>
            <p className="cd-header__date">{today}</p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cd-stats">
        <div className="cd-stat">
          <div className="cd-stat__icon cd-stat__icon--blue">
            <Phone size={20} strokeWidth={1.8} />
          </div>
          <div className="cd-stat__body">
            <span className="cd-stat__value">{stats.total}</span>
            <span className="cd-stat__label">Contacts débloqués</span>
          </div>
        </div>

        <div className="cd-stat">
          <div className="cd-stat__icon cd-stat__icon--green">
            <CheckCircle size={20} strokeWidth={1.8} />
          </div>
          <div className="cd-stat__body">
            <span className="cd-stat__value cd-stat__value--active">{stats.actifs}</span>
            <span className="cd-stat__label">Contacts actifs</span>
          </div>
        </div>

        <div className="cd-stat">
          <div className="cd-stat__icon cd-stat__icon--teal">
            <TrendingUp size={20} strokeWidth={1.8} />
          </div>
          <div className="cd-stat__body">
            <span className="cd-stat__value">{fmtPrice(stats.depense)}</span>
            <span className="cd-stat__label">Total dépensé</span>
          </div>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <p className="cd-section-label">
        <ShoppingCart size={13} strokeWidth={2} /> Actions rapides
      </p>
      <nav className="cd-actions" aria-label="Navigation">
        <Link to="/produits" className="cd-action-card" style={{ animationDelay: '0s' }}>
          <div className="cd-action-card__icon">
            <ShoppingCart size={30} strokeWidth={1.5} />
          </div>
          <span className="cd-action-card__text">Parcourir les produits</span>
          <span className="cd-action-card__desc">Trouver de nouveaux vendeurs</span>
        </Link>
        <Link to="/profil" className="cd-action-card" style={{ animationDelay: '0.07s' }}>
          <div className="cd-action-card__icon">
            <User size={30} strokeWidth={1.5} />
          </div>
          <span className="cd-action-card__text">Mon profil</span>
          <span className="cd-action-card__desc">Modifier vos informations</span>
        </Link>
      </nav>

      {/* ── Historique contacts ── */}
      <p className="cd-section-label" style={{ marginTop: '2rem' }}>
        <Phone size={13} strokeWidth={2} /> Historique des contacts débloqués
      </p>

      {loading && (
        <div className="cd-loading">
          <div className="cd-spinner" />
          <span>Chargement…</span>
        </div>
      )}

      {!loading && error && (
        <div className="cd-error">
          <span>{error}</span>
          <button className="cd-retry" onClick={fetchContacts}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {!loading && !error && contacts.length === 0 && (
        <div className="cd-empty">
          <Phone size={36} strokeWidth={1.2} />
          <p>Vous n'avez pas encore débloqué de contact vendeur.</p>
          <Link to="/produits" className="cd-cta-btn">Voir les produits →</Link>
        </div>
      )}

      {!loading && !error && contacts.length > 0 && (
        <div className="cd-contacts-list">
          {contacts.map((c) => {
            const meta = STATUS_META[c.status] || STATUS_META.pending;
            const StatusIcon = meta.icon;
            return (
              <div key={c.id} className="cd-contact-row">
                <div className="cd-contact-row__icon">
                  <Phone size={18} strokeWidth={1.8} />
                </div>
                <div className="cd-contact-row__info">
                  <span className="cd-contact-row__product">{c.product_nom || 'Produit'}</span>
                  <span className="cd-contact-row__seller">
                    {c.seller_nom ? `Vendeur : ${c.seller_nom}` : ''}
                    {c.seller_phone ? ` · ${c.seller_phone}` : ''}
                  </span>
                </div>
                <div className="cd-contact-row__right">
                  <span className={`cd-status-chip ${meta.cls}`}>
                    <StatusIcon size={11} strokeWidth={2.5} />
                    {meta.label}
                  </span>
                  <span className="cd-contact-row__date">
                    {c.expires_at ? `Exp. ${fmtDate(c.expires_at)}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default ConsumerDashboard;
