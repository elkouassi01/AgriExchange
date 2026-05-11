import React, { useState, useEffect, useRef } from 'react';
import './TransactionsPage.css';
import {
  Box, Chip, CircularProgress, FormControl, IconButton,
  InputLabel, MenuItem, Select, TextField, Tooltip,
} from '@mui/material';
import { FileDownload as ExportIcon, Refresh as RefreshIcon, Search as SearchIcon } from '@mui/icons-material';
import { fetchTransactions, fetchTransactionStats } from '../../services/adminService';

const STATUS_MAP = {
  success:   { label: 'Réussie',    color: '#15803d', bg: '#dcfce7' },
  completed: { label: 'Réussie',    color: '#15803d', bg: '#dcfce7' },
  pending:   { label: 'En attente', color: '#b45309', bg: '#fef3c7' },
  failed:    { label: 'Échouée',    color: '#b91c1c', bg: '#fee2e2' },
  refunded:  { label: 'Remboursée', color: '#0369a1', bg: '#e0f2fe' },
};

const METHOD_MAP = {
  mobile_money: 'Mobile Money',
  carte_credit: 'Carte',
  virement:     'Virement',
  cinetpay:     'CinetPay',
  admin:        'Admin',
};

const PAGE_SIZE = 20;

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d
  ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const StatCard = ({ emoji, label, value, sub, color }) => (
  <div className="tx-stat-card" style={{ borderTop: `3px solid ${color}` }}>
    <div className="tx-stat-emoji">{emoji}</div>
    <div>
      <div className="tx-stat-value" style={{ color }}>{value}</div>
      <div className="tx-stat-label">{label}</div>
      {sub && <div className="tx-stat-sub">{sub}</div>}
    </div>
  </div>
);

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError]               = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalItems, setTotalItems]     = useState(0);
  const searchDebounce = useRef(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const s = await fetchTransactionStats();
      setStats(s);
    } catch { /* non bloquant */ }
    finally { setLoadingStats(false); }
  };

  const loadTransactions = async (p, status, search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: PAGE_SIZE, status };
      if (search?.trim()) params.search = search.trim();
      const res = await fetchTransactions(params);
      setTransactions(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalItems(res.pagination?.totalItems || 0);
    } catch {
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadTransactions(1, 'all', '');
  }, []);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    loadTransactions(1, val, searchTerm);
  };

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      loadTransactions(1, statusFilter, val);
    }, 400);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadTransactions(newPage, statusFilter, searchTerm);
  };

  const handleRefresh = () => {
    loadStats();
    loadTransactions(page, statusFilter, searchTerm);
  };

  const handleExportCSV = () => {
    const header = ['Référence', 'Utilisateur', 'Email', 'Montant', 'Devise', 'Méthode', 'Statut', 'Description', 'Date'];
    const rows = transactions.map(t => [
      t.reference, t.userNom, t.userEmail, t.montant, t.devise || 'XOF',
      METHOD_MAP[t.methode] || t.methode,
      STATUS_MAP[t.statut]?.label || t.statut,
      t.description,
      fmtDate(t.createdAt),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="page-transactions">

      {/* En-tête */}
      <div className="tx-header">
        <div>
          <h1 className="tx-title">Transactions</h1>
          <p className="tx-sub">{totalItems} transaction{totalItems !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="tx-header-actions">
          <button className="tx-btn-export" onClick={handleExportCSV}>
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
      <div className="tx-stats-row">
        {loadingStats ? (
          <div style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>Chargement stats…</div>
        ) : stats ? (
          <>
            <StatCard emoji="💳" label="Total transactions" value={fmt(stats.total)}         color="#6366f1" />
            <StatCard emoji="✅" label="Revenus encaissés"  value={`${fmt(stats.revenue)} XOF`} sub={`${fmt(stats.successCount)} réussies`} color="#16a34a" />
            <StatCard emoji="⏳" label="En attente"         value={fmt(stats.pendingCount)}  sub={`${fmt(stats.pendingAmount)} XOF`}        color="#d97706" />
            <StatCard emoji="❌" label="Échouées"           value={fmt(stats.failedCount)}   color="#dc2626" />
          </>
        ) : null}
      </div>

      {/* Filtres */}
      <div className="tx-filters">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Référence, utilisateur, email…"
          value={searchTerm}
          onChange={e => handleSearchChange(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1, fontSize: 18 }} /> }}
          sx={{ flex: 1, minWidth: 220, maxWidth: 380 }}
        />
        <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} onChange={e => handleStatusChange(e.target.value)} label="Statut">
            <MenuItem value="all">Tous les statuts</MenuItem>
            <MenuItem value="success">Réussies</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="failed">Échouées</MenuItem>
            <MenuItem value="refunded">Remboursées</MenuItem>
          </Select>
        </FormControl>
      </div>

      {error && <div className="tx-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="tx-loading"><CircularProgress color="success" size={32} /><span>Chargement…</span></div>
      ) : (
        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Utilisateur</th>
                <th>Montant</th>
                <th>Méthode</th>
                <th>Description</th>
                <th>Date</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="tx-empty">Aucune transaction trouvée</td></tr>
              ) : transactions.map(t => {
                const st = STATUS_MAP[t.statut] || { label: t.statut || '—', color: '#64748b', bg: '#f1f5f9' };
                return (
                  <tr key={t.id} className="tx-row">
                    <td className="tx-cell">
                      <span className="tx-ref">{t.reference || t.id?.slice(0, 8)}</span>
                    </td>
                    <td className="tx-cell">
                      <div className="tx-user-nom">{t.userNom || '—'}</div>
                      <div className="tx-user-email">{t.userEmail}</div>
                    </td>
                    <td className="tx-cell">
                      <span className="tx-montant">{fmt(t.montant)} <span className="tx-devise">{t.devise || 'XOF'}</span></span>
                    </td>
                    <td className="tx-cell">
                      <Chip label={METHOD_MAP[t.methode] || t.methode || '—'} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                    </td>
                    <td className="tx-cell tx-desc">{t.description || '—'}</td>
                    <td className="tx-cell tx-date">{fmtDate(t.createdAt)}</td>
                    <td className="tx-cell">
                      <span className="tx-status-badge" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="tx-pagination">
              <span className="tx-pagination-info">Page {page} sur {totalPages}</span>
              <div className="tx-pagination-btns">
                <button className="tx-page-btn" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>‹ Préc.</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="tx-page-ellipsis">…</span>
                    : <button key={p} className={`tx-page-btn ${page === p ? 'tx-page-btn--active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
                  )}
                <button className="tx-page-btn" disabled={page === totalPages} onClick={() => handlePageChange(page + 1)}>Suiv. ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Box>
  );
};

export default TransactionsPage;
