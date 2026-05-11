import React, { useState, useEffect, useCallback } from 'react';
import './SettingsPage.css';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { fetchSystemStatus, sendTestNotification } from '../../services/adminService';

// ── Helpers ─────────────────────────────────────────────
const fmtUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ── Sub-components ───────────────────────────────────────
const ServiceCard = ({ label, status, detail, icon }) => {
  const isOk = status === 'ok';
  const isWarn = status === 'disconnected' || status === 'unknown';
  return (
    <div className={`set-service-card ${isOk ? 'set-service--ok' : isWarn ? 'set-service--warn' : 'set-service--error'}`}>
      <div className="set-service-icon">{icon}</div>
      <div className="set-service-body">
        <div className="set-service-label">{label}</div>
        <div className="set-service-detail">{detail || '—'}</div>
      </div>
      <div className={`set-service-dot ${isOk ? 'set-dot--ok' : isWarn ? 'set-dot--warn' : 'set-dot--error'}`} />
    </div>
  );
};

const MetricCard = ({ label, value, unit }) => (
  <div className="set-metric-card">
    <div className="set-metric-value">{value}</div>
    <div className="set-metric-label">{label}</div>
    {unit && <div className="set-metric-unit">{unit}</div>}
  </div>
);

const DbCountCard = ({ label, value, color }) => (
  <div className="set-db-card" style={{ borderLeft: `3px solid ${color}` }}>
    <div className="set-db-value" style={{ color }}>{Number(value || 0).toLocaleString('fr-FR')}</div>
    <div className="set-db-label">{label}</div>
  </div>
);

// ── Page ────────────────────────────────────────────────
const TABS = [
  { id: 'system',        label: 'Système',       emoji: '🖥️' },
  { id: 'notifications', label: 'Notifications',  emoji: '📧' },
  { id: 'general',       label: 'Général',        emoji: '⚙️' },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab]     = useState('system');
  const [status, setStatus]           = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult]   = useState(null); // { ok, message }

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError('');
    try {
      const data = await fetchSystemStatus();
      setStatus(data);
    } catch (e) {
      setStatusError(e.message);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSendTest = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await sendTestNotification();
      setTestResult({ ok: true, message: res.message });
    } catch (e) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="page-parametres">

      {/* Header */}
      <div className="set-header">
        <div>
          <h1 className="set-title">Paramètres</h1>
          <p className="set-sub">Administration de la plateforme VivriMarket</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="set-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`set-tab ${activeTab === t.id ? 'set-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="set-tab-emoji">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Système ─────────────────────────────── */}
      {activeTab === 'system' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h2 className="set-panel-title">Santé du système</h2>
            <Tooltip title="Rafraîchir">
              <IconButton onClick={loadStatus} disabled={loadingStatus} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>

          {loadingStatus ? (
            <div className="set-loading"><CircularProgress size={28} color="success" /><span>Vérification des services…</span></div>
          ) : statusError ? (
            <div className="set-error">{statusError}</div>
          ) : status ? (
            <>
              {/* Services */}
              <h3 className="set-section-title">Services</h3>
              <div className="set-services-grid">
                <ServiceCard
                  label="Base de données MySQL"
                  status={status.mysql?.status}
                  detail={status.mysql?.status === 'ok' ? 'Connectée' : 'Erreur de connexion'}
                  icon="🗄️"
                />
                <ServiceCard
                  label="WhatsApp"
                  status={status.whatsapp?.status}
                  detail={
                    !status.whatsapp?.enabled ? 'Désactivé (WHATSAPP_ENABLED=false)'
                    : status.whatsapp?.status === 'ok' ? 'Connecté et prêt'
                    : 'Déconnecté — scanner le QR code'
                  }
                  icon="💬"
                />
                <ServiceCard
                  label="Email (SMTP)"
                  status={status.email?.status}
                  detail={
                    status.email?.status === 'ok'
                      ? `${status.email.config?.host} — ${status.email.config?.from}`
                      : `Erreur SMTP — ${status.email?.config?.host || '—'}`
                  }
                  icon="📧"
                />
              </div>

              {/* Serveur */}
              <h3 className="set-section-title" style={{ marginTop: '24px' }}>Serveur</h3>
              <div className="set-metrics-grid">
                <MetricCard label="Uptime" value={fmtUptime(status.server?.uptimeSeconds || 0)} />
                <MetricCard label="Node.js" value={status.server?.nodeVersion || '—'} />
                <MetricCard label="Environnement" value={status.server?.env || '—'} />
                <MetricCard label="RAM utilisée" value={status.server?.memory?.heapUsed || 0} unit="Mo" />
                <MetricCard label="RAM totale" value={status.server?.memory?.heapTotal || 0} unit="Mo" />
                <MetricCard label="RSS" value={status.server?.memory?.rss || 0} unit="Mo" />
              </div>

              {/* DB counts */}
              <h3 className="set-section-title" style={{ marginTop: '24px' }}>Base de données</h3>
              <div className="set-db-grid">
                <DbCountCard label="Utilisateurs"   value={status.mysql?.counts?.users}        color="#6366f1" />
                <DbCountCard label="Transactions"   value={status.mysql?.counts?.transactions}  color="#16a34a" />
                <DbCountCard label="Abonnements"    value={status.mysql?.counts?.abonnements}   color="#d97706" />
                <DbCountCard label="Produits"       value={status.mysql?.counts?.products}      color="#0369a1" />
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Tab: Notifications ───────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h2 className="set-panel-title">Notifications</h2>
          </div>

          {/* Email config */}
          <h3 className="set-section-title">Configuration Email (SMTP)</h3>
          <p className="set-section-desc">
            Les paramètres SMTP sont définis dans le fichier <code>.env</code> du serveur.
            Modifiez-les directement dans ce fichier puis redémarrez le serveur.
          </p>
          {status?.email && (
            <div className="set-config-grid">
              <div className="set-config-row">
                <span className="set-config-key">Serveur SMTP</span>
                <span className="set-config-val">{status.email.config?.host || '—'}</span>
              </div>
              <div className="set-config-row">
                <span className="set-config-key">Expéditeur</span>
                <span className="set-config-val">{status.email.config?.from || '—'}</span>
              </div>
              <div className="set-config-row">
                <span className="set-config-key">Utilisateur SMTP</span>
                <span className="set-config-val">{status.email.config?.user || '—'}</span>
              </div>
              <div className="set-config-row">
                <span className="set-config-key">Statut</span>
                <span className={`set-config-val ${status.email.status === 'ok' ? 'set-val--ok' : 'set-val--error'}`}>
                  {status.email.status === 'ok' ? '✅ Opérationnel' : '❌ Erreur de connexion'}
                </span>
              </div>
            </div>
          )}

          {/* Test email */}
          <h3 className="set-section-title" style={{ marginTop: '24px' }}>Tester l'envoi d'email</h3>
          <p className="set-section-desc">
            Envoie un email de test à votre adresse admin pour vérifier que le service fonctionne correctement.
          </p>
          <button
            className="set-btn-test"
            onClick={handleSendTest}
            disabled={testSending}
          >
            {testSending ? <><CircularProgress size={14} color="inherit" style={{ marginRight: 8 }} />Envoi…</> : '📧 Envoyer un email de test'}
          </button>
          {testResult && (
            <div className={`set-test-result ${testResult.ok ? 'set-test--ok' : 'set-test--error'}`}>
              {testResult.ok ? '✅' : '❌'} {testResult.message}
            </div>
          )}

          {/* WhatsApp */}
          <h3 className="set-section-title" style={{ marginTop: '24px' }}>WhatsApp</h3>
          <p className="set-section-desc">
            Le client WhatsApp est initialisé au démarrage du serveur.
            Pour reconnecter, redémarrez le processus PM2 et scannez le QR code affiché dans les logs.
          </p>
          {status?.whatsapp && (
            <div className="set-config-grid">
              <div className="set-config-row">
                <span className="set-config-key">Statut</span>
                <span className={`set-config-val ${status.whatsapp.status === 'ok' ? 'set-val--ok' : 'set-val--warn'}`}>
                  {status.whatsapp.status === 'ok' ? '✅ Connecté' : '⚠️ Déconnecté'}
                </span>
              </div>
              <div className="set-config-row">
                <span className="set-config-key">Activé</span>
                <span className="set-config-val">{status.whatsapp.enabled ? 'Oui' : 'Non (WHATSAPP_ENABLED=false)'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Général ─────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="set-panel">
          <div className="set-panel-header">
            <h2 className="set-panel-title">Informations générales</h2>
          </div>

          <p className="set-section-desc">
            Ces informations reflètent la configuration actuelle du serveur.
            Pour les modifier, mettez à jour les variables d'environnement dans <code>.env</code>.
          </p>

          <h3 className="set-section-title">Plateforme</h3>
          <div className="set-config-grid">
            <div className="set-config-row">
              <span className="set-config-key">Nom de la plateforme</span>
              <span className="set-config-val">VivriMarket</span>
            </div>
            <div className="set-config-row">
              <span className="set-config-key">Devise</span>
              <span className="set-config-val">XOF (Franc CFA)</span>
            </div>
            <div className="set-config-row">
              <span className="set-config-key">Langue par défaut</span>
              <span className="set-config-val">Français (fr-FR)</span>
            </div>
            <div className="set-config-row">
              <span className="set-config-key">Fuseau horaire</span>
              <span className="set-config-val">Africa/Abidjan (UTC+0)</span>
            </div>
            <div className="set-config-row">
              <span className="set-config-key">Prestataire de paiement</span>
              <span className="set-config-val">CinetPay</span>
            </div>
            <div className="set-config-row">
              <span className="set-config-key">Fournisseur base de données</span>
              <span className="set-config-val">{status?.server ? 'MySQL (mysql2)' : '—'}</span>
            </div>
          </div>

          <h3 className="set-section-title" style={{ marginTop: '24px' }}>Formules d'abonnement</h3>
          <div className="set-plans-grid">
            {[
              { name: 'BLEU',     duration: '1 mois',  quota: '1 vue/mois',      color: '#0369a1', bg: '#e0f2fe' },
              { name: 'GOLD',     duration: '3 mois',  quota: '5 vues/mois',     color: '#b45309', bg: '#fef3c7' },
              { name: 'PLATINUM', duration: '6 mois',  quota: 'Vues illimitées', color: '#7c3aed', bg: '#ede9fe' },
            ].map(plan => (
              <div key={plan.name} className="set-plan-card" style={{ borderTop: `3px solid ${plan.color}` }}>
                <span className="set-plan-badge" style={{ color: plan.color, background: plan.bg }}>{plan.name}</span>
                <div className="set-plan-info">
                  <span>⏱ {plan.duration}</span>
                  <span>👁 {plan.quota}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
