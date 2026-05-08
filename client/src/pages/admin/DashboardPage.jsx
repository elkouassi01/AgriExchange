import './DashboardPage.css';
import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import StatCard from '../../components/admin/StatCard';
import ActivityChart from '../../components/admin/ActivityChart';
import { fetchDashboardStats } from '../../services/adminService';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { admin } = useAdminAuth();

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(err => console.error('Dashboard stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loader">
        <div className="loader-spinner"></div>
        <p className="loader-text">Chargement des données...</p>
      </div>
    );
  }

  const totalSubs = stats?.subscriptions?.reduce((a, s) => a + s.count, 0) || 0;

  return (
    <div className="dashboard-container">

      {/* En-tête */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Tableau de bord</h1>
          <p className="dashboard-subtitle">Bonjour, {admin?.nom || 'Administrateur'} 👋</p>
        </div>
        <div className="current-date">
          <span className="date-day">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}
          </span>
          <span className="date-full">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="stats-grid">
        <StatCard
          title="Utilisateurs"
          icon="👥"
          value={stats?.users?.total || 0}
          change={0}
          description="inscrits au total"
        />
        <StatCard
          title="Agriculteurs"
          icon="🌾"
          value={stats?.users?.farmers || 0}
          change={0}
          description="comptes vendeurs"
        />
        <StatCard
          title="Consommateurs"
          icon="🛒"
          value={stats?.users?.consumers || 0}
          change={0}
          description="comptes acheteurs"
        />
        <StatCard
          title="Revenu total"
          icon="💰"
          value={`${(stats?.revenue?.total || 0).toLocaleString('fr-FR')} XOF`}
          change={stats?.revenue?.growth || 0}
          description="transactions réussies"
        />
      </div>

      {/* Graphique + Stats transactions */}
      <div className="charts-container">
        <div className="activity-card">
          <div className="card-header">
            <h2 className="card-title">Activité mensuelle</h2>
          </div>
          <ActivityChart data={stats?.activityData || []} />
        </div>

        <div className="transactions-card">
          <div className="card-header">
            <h2 className="card-title">Transactions</h2>
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
            <span className="badge-count">{totalSubs}</span>
          </div>
          <div className="subscriptions-content">
            {totalSubs > 0 ? (
              <ul className="subscriptions-list">
                {stats.subscriptions.map((sub, i) => {
                  const pct = totalSubs ? Math.round((sub.count / totalSubs) * 100) : 0;
                  return (
                    <li key={i} className="subscription-item">
                      <div className="subscription-info">
                        <span className={`sub-dot sub-${sub.formule.toLowerCase()}`}></span>
                        <span className="subscription-name">{sub.formule}</span>
                        <span className="subscription-count">{sub.count} abonnés</span>
                      </div>
                      <div className="subscription-bar-row">
                        <div className="subscription-bar-track">
                          <div
                            className={`subscription-bar-fill fill-${sub.formule.toLowerCase()}`}
                            style={{ width: `${pct}%` }}
                          />
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

        {/* Demandes vendeur */}
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
            <strong>{(stats?.productPayments?.revenue || 0).toLocaleString('fr-FR')} XOF</strong>
          </div>
          {(stats?.suspendedFarmers || 0) > 0 && (
            <div className="suspended-alert">
              ⚠️ {stats.suspendedFarmers} agriculteur(s) suspendu(s) — en attente de régularisation
            </div>
          )}
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
