import React, { useState, useEffect, useRef } from 'react';
import './SubscriptionsPage.css';
import {
  Box, Chip, CircularProgress, FormControl,
  IconButton, InputLabel, MenuItem, Select, TextField, Tooltip,
} from '@mui/material';
import { FileDownload as ExportIcon, Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { fetchSubscriptions } from '../../services/adminService';

const PAGE_SIZE = 20;

const FORMULE_STYLE = {
  BLEU:     { color: '#0369a1', bg: '#e0f2fe' },
  GOLD:     { color: '#b45309', bg: '#fef3c7' },
  PLATINUM: { color: '#7c3aed', bg: '#ede9fe' },
};

const fmt = (d) => d
  ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

const fmtMoney = (n) => Number(n || 0).toLocaleString('fr-FR');

// Returns { label, className } for days remaining
const getDaysInfo = (dateExpiration, isActive, status) => {
  if (status === 'cancelled') return null;
  if (status === 'pending')   return null;
  const now  = new Date();
  const exp  = new Date(dateExpiration);
  const diff = Math.round((exp - now) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: `Expiré J+${Math.abs(diff)}`, cls: 'sub-days--expired' };
  if (diff === 0) return { label: 'Expire aujourd\'hui', cls: 'sub-days--urgent' };
  if (diff <= 7)  return { label: `J-${diff}`, cls: 'sub-days--urgent' };
  if (diff <= 30) return { label: `J-${diff}`, cls: 'sub-days--soon' };
  return { label: `J-${diff}`, cls: 'sub-days--ok' };
};

const StatCard = ({ emoji, label, value, sub, color }) => (
  <div className="sub-stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="sub-stat-emoji">{emoji}</div>
    <div>
      <div className="sub-stat-value" style={{ color }}>{value}</div>
      <div className="sub-stat-label">{label}</div>
      {sub && <div className="sub-stat-sub">{sub}</div>}
    </div>
  </div>
);

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError]               = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formuleFilter, setFormuleFilter] = useState('all');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalItems, setTotalItems]     = useState(0);
  const searchDebounce = useRef(null);

  const load = async (p, status, formule, search, isStatsRefresh = false) => {
    if (isStatsRefresh) setLoadingStats(true);
    setLoading(true);
    setError('');
    try {
      const res = await fetchSubscriptions({ page: p, limit: PAGE_SIZE, status, formule, search });
      setSubscriptions(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
      if (res.stats) {
        setStats(res.stats);
        setLoadingStats(false);
      }
    } catch {
      setError('Erreur lors du chargement des abonnements');
    } finally {
      setLoading(false);
      if (isStatsRefresh) setLoadingStats(false);
    }
  };

  useEffect(() => { load(1, 'all', 'all', '', true); }, []);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    load(1, val, formuleFilter, searchTerm);
  };

  const handleFormuleChange = (val) => {
    setFormuleFilter(val);
    setPage(1);
    load(1, statusFilter, val, searchTerm);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      load(1, statusFilter, formuleFilter, val);
    }, 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    load(newPage, statusFilter, formuleFilter, searchTerm);
  };

  const handleRefresh = () => load(page, statusFilter, formuleFilter, searchTerm, true);

  const handleExportCSV = () => {
    const header = ['Utilisateur', 'Email', 'Formule', 'Montant', 'Début', 'Expiration', 'Statut'];
    const rows = subscriptions.map(s => {
      const statusLabel = s.status === 'cancelled' ? 'Annulé'
        : s.status === 'pending' ? 'En attente'
        : s.isActive ? 'Actif' : 'Expiré';
      return [s.userNom, s.userEmail, s.formule, s.montant, fmt(s.dateDebut), fmt(s.dateExpiration), statusLabel];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abonnements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="page-abonnements">

      {/* En-tête */}
      <div className="sub-header">
        <div>
          <h1 className="sub-title">Abonnements</h1>
          <p className="sub-sub">{totalItems} abonnement{totalItems !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="sub-header-actions">
          <button className="sub-btn-export" onClick={handleExportCSV}>
            <ExportIcon style={{ fontSize: 16 }} /> Exporter CSV
          </button>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={handleRefresh} disabled={loading} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Stat cards */}
      <div className="sub-stats-row">
        {loadingStats ? (
          <div className="sub-stats-loading">Chargement stats…</div>
        ) : stats ? (
          <>
            <StatCard emoji="📋" label="Total"        value={fmtMoney(stats.total)}        color="#6366f1" />
            <StatCard emoji="✅" label="Actifs"        value={fmtMoney(stats.active)}       color="#16a34a" />
            <StatCard emoji="⏰" label="Expire bientôt" value={fmtMoney(stats.expiringSoon ?? '—')} color="#d97706" />
            <StatCard emoji="❌" label="Expirés"       value={fmtMoney(stats.expired)}      color="#dc2626" />
            <StatCard emoji="💰" label="Revenu total"  value={`${fmtMoney(stats.totalRevenue)} XOF`} color="#0369a1"
              sub={`BLEU: ${stats.byFormule?.BLEU ?? 0} · GOLD: ${stats.byFormule?.GOLD ?? 0} · PLAT: ${stats.byFormule?.PLATINUM ?? 0}`}
            />
          </>
        ) : null}
      </div>

      {/* Filtres */}
      <div className="sub-filters">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Nom, email…"
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: 1, minWidth: 200, maxWidth: 340 }}
        />
        <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} onChange={e => handleStatusChange(e.target.value)} label="Statut">
            <MenuItem value="all">Tous les statuts</MenuItem>
            <MenuItem value="active">Actifs</MenuItem>
            <MenuItem value="expiring_soon">⚠️ Expire bientôt</MenuItem>
            <MenuItem value="expired">Expirés</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="cancelled">Annulés</MenuItem>
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Formule</InputLabel>
          <Select value={formuleFilter} onChange={e => handleFormuleChange(e.target.value)} label="Formule">
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="BLEU">BLEU</MenuItem>
            <MenuItem value="GOLD">GOLD</MenuItem>
            <MenuItem value="PLATINUM">PLATINUM</MenuItem>
          </Select>
        </FormControl>
      </div>

      {error && <div className="sub-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="sub-loading"><CircularProgress color="success" size={32} /><span>Chargement…</span></div>
      ) : (
        <div className="sub-table-wrap">
          <table className="sub-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Formule</th>
                <th>Montant</th>
                <th>Début</th>
                <th>Expiration</th>
                <th>Durée restante</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr><td colSpan={7} className="sub-empty">Aucun abonnement trouvé</td></tr>
              ) : subscriptions.map(s => {
                const fs = FORMULE_STYLE[s.formule] || { color: '#475569', bg: '#f1f5f9' };
                const daysInfo = getDaysInfo(s.dateExpiration, s.isActive, s.status);

                return (
                  <tr key={s.id} className="sub-row">
                    <td className="sub-cell">
                      <div className="sub-user-nom">{s.userNom || '—'}</div>
                      <div className="sub-user-email">{s.userEmail}</div>
                    </td>
                    <td className="sub-cell">
                      <span className="sub-formule-badge" style={{ color: fs.color, background: fs.bg }}>
                        {s.formule || '—'}
                      </span>
                    </td>
                    <td className="sub-cell">
                      <span className="sub-montant">{fmtMoney(s.montant)} <span className="sub-devise">XOF</span></span>
                    </td>
                    <td className="sub-cell sub-date">{fmt(s.dateDebut)}</td>
                    <td className="sub-cell sub-date">{fmt(s.dateExpiration)}</td>
                    <td className="sub-cell">
                      {daysInfo
                        ? <span className={`sub-days ${daysInfo.cls}`}>{daysInfo.label}</span>
                        : <span className="sub-days sub-days--na">—</span>
                      }
                    </td>
                    <td className="sub-cell">
                      {s.status === 'cancelled' ? (
                        <span className="sub-status-badge" style={{ color: '#64748b', background: '#f1f5f9' }}>Annulé</span>
                      ) : s.status === 'pending' ? (
                        <span className="sub-status-badge" style={{ color: '#b45309', background: '#fef3c7' }}>En attente</span>
                      ) : s.isActive ? (
                        <span className="sub-status-badge" style={{ color: '#15803d', background: '#dcfce7' }}>Actif</span>
                      ) : (
                        <span className="sub-status-badge" style={{ color: '#b91c1c', background: '#fee2e2' }}>Expiré</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sub-pagination">
              <span className="sub-pagination-info">Page {page} sur {totalPages}</span>
              <div className="sub-pagination-btns">
                <button className="sub-page-btn" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>‹ Préc.</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="sub-page-ellipsis">…</span>
                    : <button key={p} className={`sub-page-btn ${page === p ? 'sub-page-btn--active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                  )}
                <button className="sub-page-btn" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suiv. ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

export default SubscriptionsPage;
