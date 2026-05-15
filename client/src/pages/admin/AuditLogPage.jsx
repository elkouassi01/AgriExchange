import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, MenuItem, Select } from '@mui/material';
import { fetchAuditLogs } from '../../services/adminService';

const ACTION_LABELS = {
  'user.create':      { label: 'Création compte',    color: '#16a34a', bg: '#dcfce7' },
  'user.delete':      { label: 'Suppression compte', color: '#dc2626', bg: '#fee2e2' },
  'user.role_change': { label: 'Changement rôle',    color: '#7c3aed', bg: '#ede9fe' },
  'user.suspend':     { label: 'Suspension',          color: '#ea580c', bg: '#ffedd5' },
  'user.unsuspend':   { label: 'Déblocage',           color: '#0369a1', bg: '#e0f2fe' },
  'product.approve':  { label: 'Denrée approuvée',   color: '#15803d', bg: '#dcfce7' },
  'product.reject':   { label: 'Denrée rejetée',     color: '#b91c1c', bg: '#fee2e2' },
};

const PAGE_SIZE = 20;

const AuditLogPage = () => {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const filterDebounce = useRef(null);

  const loadLogs = async (p, action) => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs({ page: p, limit: PAGE_SIZE, action: action || undefined });
      setLogs(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch {
      setError('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(1, ''); }, []);

  const handleActionChange = (value) => {
    setActionFilter(value);
    clearTimeout(filterDebounce.current);
    filterDebounce.current = setTimeout(() => {
      setPage(1);
      loadLogs(1, value);
    }, 200);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadLogs(newPage, actionFilter);
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Journal d'audit</h1>
        <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.875rem' }}>
          {totalItems} action{totalItems !== 1 ? 's' : ''} enregistrée{totalItems !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Filtre */}
      <div style={{ marginBottom: '1rem' }}>
        <Select
          size="small"
          value={actionFilter}
          onChange={e => handleActionChange(e.target.value)}
          displayEmpty
          sx={{ minWidth: 200, fontSize: '0.875rem', background: 'white' }}
        >
          <MenuItem value="">Toutes les actions</MenuItem>
          {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
            <MenuItem key={key} value={key}>{label}</MenuItem>
          ))}
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '3rem', color: '#64748b' }}>
          <CircularProgress color="success" size={28} />
          <span>Chargement…</span>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Date / Heure', 'Administrateur', 'Action', 'Cible', 'Détails'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    Aucune action enregistrée
                  </td>
                </tr>
              ) : logs.map((log) => {
                const cfg = ACTION_LABELS[log.action] || { label: log.action, color: '#64748b', bg: '#f1f5f9' };
                const details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null;
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', whiteSpace: 'nowrap' }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                      {log.admin_nom || log.admin_id?.slice(0, 8) + '…'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                      {log.target_label || log.target_id || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.875rem' }}>
              <span>Page {page} sur {totalPages}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 1 ? '#f8fafc' : 'white', cursor: page === 1 ? 'default' : 'pointer', color: '#475569' }}
                >
                  ‹ Préc.
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === totalPages ? '#f8fafc' : 'white', cursor: page === totalPages ? 'default' : 'pointer', color: '#475569' }}
                >
                  Suiv. ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

export default AuditLogPage;
