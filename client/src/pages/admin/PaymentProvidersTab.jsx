import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/axiosConfig';

// Static schema: which fields each provider needs
const PROVIDER_SCHEMAS = {
  cinetpay: [
    { key: 'api_key',      label: 'Clé API',            type: 'text',     placeholder: 'sk_live_...' },
    { key: 'api_password', label: 'Mot de passe API',   type: 'password', placeholder: '••••••••' },
    { key: 'country',      label: 'Pays',               type: 'select',   placeholder: 'CI',
      options: [
        { value: 'CI', label: 'CI — Côte d\'Ivoire' },
        { value: 'SN', label: 'SN — Sénégal' },
        { value: 'CM', label: 'CM — Cameroun' },
        { value: 'BF', label: 'BF — Burkina Faso' },
        { value: 'ML', label: 'ML — Mali' },
        { value: 'GN', label: 'GN — Guinée' },
        { value: 'TG', label: 'TG — Togo' },
        { value: 'BJ', label: 'BJ — Bénin' },
      ]
    },
  ],
  cinetpay_legacy: [
    { key: 'apikey',   label: 'API Key (numérique)', type: 'text',     placeholder: '8937149296...' },
    { key: 'site_id',  label: 'Site ID',             type: 'text',     placeholder: '105896693' },
  ],
  paydunya: [
    { key: 'master_key',  label: 'Master Key',   type: 'password', placeholder: '••••••••' },
    { key: 'private_key', label: 'Private Key',  type: 'password', placeholder: '••••••••' },
    { key: 'public_key',  label: 'Public Key',   type: 'text',     placeholder: 'live_...' },
    { key: 'token',       label: 'Token',        type: 'password', placeholder: '••••••••' },
    { key: 'mode',        label: 'Mode',         type: 'select',   placeholder: 'live',
      options: [{ value: 'live', label: 'Production' }, { value: 'test', label: 'Sandbox' }]
    },
  ],
  stripe: [
    { key: 'secret_key',      label: 'Clé secrète',         type: 'password', placeholder: 'sk_live_...' },
    { key: 'publishable_key', label: 'Clé publique',        type: 'text',     placeholder: 'pk_live_...' },
    { key: 'webhook_secret',  label: 'Webhook Secret',      type: 'password', placeholder: 'whsec_...' },
    { key: 'currency',        label: 'Devise',              type: 'select',   placeholder: 'eur',
      options: [
        { value: 'eur', label: 'EUR — Euro' },
        { value: 'usd', label: 'USD — Dollar' },
      ]
    },
  ],
};

// ── Provider card ──────────────────────────────────────────
const ProviderCard = ({ provider, onUpdated }) => {
  const [expanded, setExpanded]     = useState(false);
  const [config, setConfig]         = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [enabled, setEnabled]       = useState(!!provider.enabled);
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [msg, setMsg]               = useState('');

  const schema = PROVIDER_SCHEMAS[provider.id] || [];

  const loadConfig = useCallback(async () => {
    if (configLoaded) return;
    try {
      const res = await api.get(`/admin/payment-providers/${provider.id}/config`);
      setConfig(res.data.config || {});
      setEnabled(res.data.enabled);
      setConfigLoaded(true);
    } catch { setConfigLoaded(true); }
  }, [provider.id, configLoaded]);

  const handleExpand = () => {
    if (!expanded) loadConfig();
    setExpanded(e => !e);
    setTestResult(null);
  };

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    try {
      await api.put(`/admin/payment-providers/${provider.id}`, { enabled: next });
      onUpdated();
    } catch { setEnabled(!next); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await api.post(`/admin/payment-providers/${provider.id}/test`, { config });
      setTestResult({ ok: res.data.connected, message: res.data.message });
    } catch (e) {
      setTestResult({ ok: false, message: e.response?.data?.message || e.message });
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await api.put(`/admin/payment-providers/${provider.id}`, { enabled, config });
      setMsg('Configuration enregistrée.');
      onUpdated();
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Erreur.');
    } finally { setSaving(false); }
  };

  return (
    <div className={`pp-card ${enabled ? 'pp-card--active' : ''}`}>
      {/* Header */}
      <div className="pp-card-header">
        <div className="pp-card-left">
          <span className="pp-card-icon">{provider.icon}</span>
          <div>
            <div className="pp-card-name">{provider.label}</div>
            <div className="pp-card-desc">{provider.description}</div>
          </div>
        </div>
        <div className="pp-card-right">
          <span className={`pp-status ${enabled ? 'pp-status--on' : 'pp-status--off'}`}>
            {enabled ? 'Actif' : 'Inactif'}
          </span>
          <button
            className={`cat-toggle ${enabled ? 'cat-toggle--on' : ''}`}
            onClick={handleToggle}
          >
            {enabled ? 'Oui' : 'Non'}
          </button>
          <button className="pp-config-btn" onClick={handleExpand}>
            {expanded ? '▲ Réduire' : '⚙️ Configurer'}
          </button>
        </div>
      </div>

      {/* Config form */}
      {expanded && (
        <div className="pp-config-body">
          {schema.length === 0 ? (
            <p className="pp-no-config">Ce provider ne nécessite pas de configuration supplémentaire.</p>
          ) : (
            <div className="pp-fields">
              {schema.map(field => (
                <div key={field.key} className="pp-field">
                  <label className="pay-label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      className="pay-input"
                      value={config[field.key] || ''}
                      onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                    >
                      <option value="">— Choisir —</option>
                      {field.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="pay-input pay-input--mono"
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      autoComplete="new-password"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {testResult && (
            <div className={`set-test-result ${testResult.ok ? 'set-test--ok' : 'set-test--error'}`} style={{ marginTop: 12 }}>
              {testResult.ok ? '✅' : '❌'} {testResult.message}
            </div>
          )}
          {msg && (
            <div className={`set-test-result ${msg.includes('Erreur') ? 'set-test--error' : 'set-test--ok'}`} style={{ marginTop: 8 }}>
              {msg}
            </div>
          )}

          <div className="pay-actions" style={{ marginTop: 16 }}>
            <button className="set-btn-test" onClick={handleTest} disabled={testing}>
              {testing ? 'Test…' : '🔌 Tester'}
            </button>
            <button className="pay-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main tab component ─────────────────────────────────────
export default function PaymentProvidersTab() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/payment-providers');
      setProviders(res.data.providers || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="set-panel">
      <div className="set-loading"><span>Chargement…</span></div>
    </div>
  );

  return (
    <div className="set-panel">
      <div className="set-panel-header">
        <h2 className="set-panel-title">Moyens de paiement</h2>
      </div>
      <p className="set-section-desc">
        Activez et configurez les providers de paiement disponibles sur la plateforme.
        Seuls les providers actifs sont proposés aux utilisateurs lors du paiement.
      </p>
      <div className="pp-list">
        {providers.map(p => (
          <ProviderCard key={p.id} provider={p} onUpdated={load} />
        ))}
      </div>
    </div>
  );
}
