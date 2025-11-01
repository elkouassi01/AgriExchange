// src/pages/admin/DashboardPage.jsx
import './DashboardPage.css';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import StatCard from '../../components/admin/StatCard';
import ActivityChart from '../../components/admin/ActivityChart';
import RecentTransactions from '../../components/admin/RecentTransactions';
import { fetchDashboardStats } from '../../services/adminService';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { admin, logout } = useAdminAuth();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques :", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loader">
        <div className="loader-spinner"></div>
        <p className="loader-text">Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* En-tête */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Bienvenue {admin?.nom || 'Administrateur'} </h1>
          <p className="dashboard-subtitle">Aperçu général de la plateforme AgriNet Exchange</p>
        </div>
        <div className="dashboard-header-right">
          <div className="current-date">
            <span className="date-day">{new Date().toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
            <span className="date-full">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="stats-grid">
        <StatCard
          title="Utilisateurs"
          icon="👥"
          value={stats?.totalUsers || 0}
          change={stats?.userGrowth || 0}
          description="vs mois précédent"
        />
        <StatCard
          title="Agriculteurs"
          icon="🌾"
          value={stats?.totalFarmers || 0}
          change={stats?.farmerGrowth || 0}
          description="vs mois précédent"
        />
        <StatCard
          title="Consommateurs"
          icon="🛒"
          value={stats?.totalConsumers || 0}
          change={stats?.consumerGrowth || 0}
          description="vs mois précédent"
        />
        <StatCard
          title="Revenu total"
          icon="💳"
          value={`${stats?.totalRevenue?.toLocaleString() || '0'} XOF`}
          change={stats?.revenueGrowth || 0}
          description="vs mois précédent"
        />
      </div>

      {/* Graphiques et transactions */}
      <div className="charts-container">
        <div className="activity-card">
          <div className="card-header">
            <h2 className="card-title">Activité mensuelle</h2>
            <div className="card-actions">
              <button className="time-filter active">30j</button>
              <button className="time-filter">90j</button>
              <button className="time-filter">1an</button>
            </div>
          </div>
          <ActivityChart data={stats?.activityData || []} />
        </div>

        <div className="transactions-card">
          <div className="card-header">
            <h2 className="card-title">Transactions récentes</h2>
            <button className="view-all-btn">Voir tout</button>
          </div>
          <RecentTransactions transactions={stats?.recentTransactions || []} />
        </div>
      </div>

      {/* Abonnements et statistiques supplémentaires */}
      <div className="bottom-grid">
        <div className="subscriptions-card">
          <div className="card-header">
            <h2 className="card-title">Abonnements actifs</h2>
          </div>
          <div className="subscriptions-content">
            {stats?.activeSubscriptions?.length > 0 ? (
              <>
                <div className="subscriptions-chart">
                  {stats.activeSubscriptions.map((sub, idx) => (
                    <div 
                      key={idx} 
                      className="subscription-bar"
                      style={{ height: `${(sub.count / stats.activeSubscriptions.reduce((acc, curr) => acc + curr.count, 0)) * 100}%` }}
                    >
                      <div className="bar-value">{sub.count}</div>
                      <div className="bar-label capitalize">{sub.formule}</div>
                    </div>
                  ))}
                </div>
                <ul className="subscriptions-list">
                  {stats.activeSubscriptions.map((sub, idx) => (
                    <li key={idx} className="subscription-item">
                      <div className="subscription-info">
                        <span className="subscription-name capitalize">{sub.formule}</span>
                        <span className="subscription-count">{sub.count} abonnés</span>
                      </div>
                      <div className="subscription-percent">
                        {Math.round((sub.count / stats.activeSubscriptions.reduce((acc, curr) => acc + curr.count, 0)) * 100)}%
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="empty-state">Aucun abonnement actif</p>
            )}
          </div>
        </div>

        <div className="transaction-stats-card">
          <div className="card-header">
            <h2 className="card-title">Statistiques des transactions</h2>
          </div>
          <div className="stats-boxes">
            <StatBox label="Total" value={stats?.totalTransactions || 0} bg="blue" />
            <StatBox label="Réussies" value={stats?.completedTransactions || 0} bg="green" />
            <StatBox label="En attente" value={stats?.pendingTransactions || 0} bg="yellow" />
            <StatBox label="Échouées" value={stats?.failedTransactions || 0} bg="red" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Boîte statique de transaction
const StatBox = ({ label, value, bg }) => {
  const bgColor = {
    blue: 'stat-box-blue',
    green: 'stat-box-green',
    yellow: 'stat-box-yellow',
    red: 'stat-box-red',
  };

  return (
    <div className={`stat-box ${bgColor[bg]}`}>
      <p className="stat-box-label">{label}</p>
      <p className="stat-box-value">{value}</p>
    </div>
  );
};

export default DashboardPage;
