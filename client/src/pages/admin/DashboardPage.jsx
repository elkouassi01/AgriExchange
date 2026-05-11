import './DashboardPage.css';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import StatCard from '../../components/admin/StatCard';
import ActivityChart from '../../components/admin/ActivityChart';
import { fetchDashboardStats } from '../../services/adminService';

const fmtMoney = (n) => Number(n || 0).toLocaleString('fr-FR');

const DashboardPage = () => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user: admin }       = useUser();
  const navigate              = useNavigate();

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchDashboardStats(force);
      setStats(data);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="dashboard-loader">
        <div className="loader-spinner" />
        <p className="loader-text">Chargement des données…</p>
      </div>
    );
  }

  const totalSubs = stats?.subscriptions?.reduce((a, s) => a + s.count, 0) || 0;
  const pendingModeration = stats?.products?.pending || 0;
  const suspendedFarmers  = stats?.suspendedFarmers  || 0;
  const pendingContacts   = stats?.contactRequests?.pending || 0;

  return (
    <div className="dashboard-container">

      {/* En-tête */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Tableau de bord</h1>
          <p className="dashboard-subtitle">Bonjour, {admin?.nom || 'Administrateur'} 👋</p>
        </div>
        <div className="dashboard-header-right">
          <div className="current-date">
            <span className="date-day">{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
            <span className="date-full">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <button className="dash-refresh-btn" onClick={() => load(true)} disabled={refreshing}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(pendingModeration > 0 || suspendedFarmers > 0 || pendingContacts > 0) && (
        <div className="dash-alerts">
          {pendingModeration > 0 && (
            <button className="dash-alert dash-alert--warn" onClick={() => navigate('/admin/moderation')}>
              🔍 <strong>{pendingModeration}</strong> produit{pendingModeration > 1 ? 's' : ''} en attente de modération → Voir
            </button>
          )}
          {suspendedFarmers > 0 && (
            <button className="dash-alert dash-alert--warn" onClick={() => navigate('/admin/users')}>
              ⚠️ <strong>{suspendedFarmers}</strong> agriculteur{suspendedFarmers > 1 ? 's' : ''} suspendu{suspendedFarmers > 1 ? 's' : ''} → Gérer
            </button>
          )}
          {pendingContacts > 0 && (
            <div className="dash-alert dash-alert--info">
              📬 <strong>{pendingContacts}</strong> demande{pendingContacts > 1 ? 's' : ''} vendeur en attente
            </div>
          )}
        </div>
      )}

      {/* KPIs — ligne 1 : utilisateurs + revenu + produits */}
      <div className="stats-grid">
        <StatCard
          title="Utilisateurs"
          icon="👥"
          value={stats?.users?.total || 0}
          sub={stats?.users?.newThisMonth > 0 ? `+${stats.users.newThisMonth} ce mois` : null}
          description="inscrits au total"
          variant="primary"
        />
        <StatCard
          title="Agriculteurs"
          icon="🌾"
          value={stats?.users?.farmers || 0}
          sub={stats?.users?.newFarmersMonth > 0 ? `+${stats.users.newFarmersMonth} ce mois` : null}
          description="comptes vendeurs"
          variant="success"
        />
        <StatCard
          title="Consommateurs"
          icon="🛒"
          value={stats?.users?.consumers || 0}
          sub={stats?.users?.newConsumersMonth > 0 ? `+${stats.users.newConsumersMonth} ce mois` : null}
          description="comptes acheteurs"
          variant="info"
        />
        <StatCard
          title="Revenu total"
          icon="💰"
          value={`${fmtMoney(stats?.revenue?.total)} XOF`}
          change={stats?.revenue?.growth ?? null}
          sub={stats?.revenue?.thisMonth > 0 ? `${fmtMoney(stats.revenue.thisMonth)} XOF ce mois` : null}
          description="transactions réussies"
          variant="warning"
        />
        <StatCard
          title="Produits actifs"
          icon="📦"
          value={stats?.products?.total || 0}
          sub={pendingModeration > 0 ? `${pendingModeration} en attente` : 'Tout approuvé ✓'}
          description="sur la plateforme"
          variant={pendingModeration > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Graphique + Transactions */}
      <div className="charts-container">
        <div className="activity-card">
          <div className="card-header">
            <h2 className="card-title">Activité des 6 derniers mois</h2>
            <span className="dash-badge-neutral">{stats?.transactions?.thisMonth || 0} tx ce mois</span>
          </div>
          <ActivityChart data={stats?.activityData || []} />
        </div>

        <div className="transactions-card">
          <div className="card-header">
            <h2 className="card-title">Transactions</h2>
            <button className="dash-link-btn" onClick={() => navigate('/admin/transactions')}>Voir tout →</button>
          </div>
          <div className="stats-boxes">
            <StatBox label="Total"      value={stats?.transactions?.total     || 0} bg="blue"   />
            <StatBox label="Réussies"   value={stats?.transactions?.completed || 0} bg="green"  />
            <StatBox label="En attente" value={stats?.transactions?.pending   || 0} bg="yellow" />
            <StatBox label="Échouées"   value={stats?.transactions?.failed    || 0} bg="red"    />
          </div>
        </div>
      </div>

      {/* Bas de page */}
      <div className="bottom-grid">

        {/* Abonnements */}
        <div className="subscriptions-card">
          <div className="card-header">
            <h2 className="card-title">Abonnements actifs</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge-count">{totalSubs}</span>
              <button className="dash-link-btn" onClick={() => navigate('/admin/subscriptions')}>Voir →</button>
            </div>
          </div>
          <div className="subscriptions-content">
            {totalSubs > 0 ? (
              <ul className="subscriptions-list">
                {stats.subscriptions.map((sub, i) => {
                  const pct = totalSubs ? Math.round((sub.count / totalSubs) * 100) : 0;
                  return (
                    <li key={i} className="subscription-item">
                      <div className="subscription-info">
                        <span className={`sub-dot sub-${sub.formule.toLowerCase()}`} />
                        <span className="subscription-name">{sub.formule}</span>
                        <span className="subscription-count">{sub.count} abonné{sub.count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="subscription-bar-row">
                        <div className="subscription-bar-track">
                          <div className={`subscription-bar-fill fill-${sub.formule.toLowerCase()}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="subscription-percent">{pct}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="empty-state">Aucun abonnement actif</p>
            )}
          </div>
        </div>

        {/* Demandes vendeur + raccourcis */}
        <div className="contact-card">
          <div className="card-header">
            <h2 className="card-title">Demandes vendeur</h2>
          </div>
          <div className="stats-boxes">
            <StatBox label="En attente" value={stats?.contactRequests?.pending   || 0} bg="yellow" />
            <StatBox label="Répondus"   value={stats?.contactRequests?.responded || 0} bg="green"  />
            <StatBox label="Expirés"    value={stats?.contactRequests?.expired   || 0} bg="red"    />
            <StatBox label="Paiements"  value={stats?.productPayments?.count     || 0} bg="blue"   />
          </div>
          <div className="payment-revenue">
            <span>Revenus coordonnées vendeur</span>
            <strong>{fmtMoney(stats?.productPayments?.revenue)} XOF</strong>
          </div>

          {/* Raccourcis */}
          <div className="dash-shortcuts">
            <button className="dash-shortcut" onClick={() => navigate('/admin/users')}>
              👥 Utilisateurs
            </button>
            <button className="dash-shortcut" onClick={() => navigate('/admin/transactions')}>
              💳 Transactions
            </button>
            <button className="dash-shortcut" onClick={() => navigate('/admin/subscriptions')}>
              📋 Abonnements
            </button>
            <button className="dash-shortcut" onClick={() => navigate('/admin/audit')}>
              🔍 Audit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const StatBox = ({ label, value, bg }) => {
  const cls = { blue: 'stat-box-blue', green: 'stat-box-green', yellow: 'stat-box-yellow', red: 'stat-box-red' };
  return (
    <div className={`stat-box ${cls[bg]}`}>
      <p className="stat-box-value">{value}</p>
      <p className="stat-box-label">{label}</p>
    </div>
  );
};

export default DashboardPage;
