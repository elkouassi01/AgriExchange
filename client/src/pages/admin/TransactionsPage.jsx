import React, { useState, useEffect, useCallback } from 'react';
import './TransactionsPage.css';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  Chip, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import { FileDownload as ExportIcon, Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { fetchTransactions } from '../../services/adminService';

const STATUS_MAP = {
  success:  { label: 'Réussie',    color: 'success' },
  pending:  { label: 'En attente', color: 'warning' },
  failed:   { label: 'Échouée',    color: 'error'   },
  refunded: { label: 'Remboursée', color: 'info'    },
};

const METHOD_MAP = {
  mobile_money:  'Mobile Money',
  carte_credit:  'Carte',
  virement:      'Virement',
  cinetpay:      'CinetPay',
  admin:         'Admin',
};

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchTransactions();
      const list = Array.isArray(res) ? res : (res.data || []);
      setTransactions(list);
    } catch {
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = transactions.filter(t => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (t.reference || '').toLowerCase().includes(q) ||
      (t.userNom || '').toLowerCase().includes(q) ||
      (t.userEmail || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportCSV = () => {
    const header = ['Référence', 'Utilisateur', 'Email', 'Montant', 'Devise', 'Méthode', 'Statut', 'Date'];
    const rows = filtered.map(t => [
      t.reference,
      t.userNom,
      t.userEmail,
      t.montant,
      t.devise,
      t.methode,
      t.statut,
      t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '—',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRevenu = filtered
    .filter(t => t.statut === 'success')
    .reduce((s, t) => s + (t.montant || 0), 0);

  return (
    <Box className="page-transactions">
      {/* En-tête */}
      <Box className="entete-transactions">
        <div>
          <Typography variant="h5" fontWeight={700}>Transactions</Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} transaction(s) — Revenu filtré :{' '}
            <strong>{totalRevenu.toLocaleString('fr-FR')} XOF</strong>
          </Typography>
        </div>
        <div className="actions-transactions">
          <Button variant="outlined" size="small" startIcon={<ExportIcon />} onClick={handleExportCSV}>
            Exporter CSV
          </Button>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </div>
      </Box>

      {/* Filtres */}
      <Paper className="filtres-transactions">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Référence, utilisateur, email..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <FormControl variant="outlined" size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} label="Statut">
            <MenuItem value="all">Tous les statuts</MenuItem>
            <MenuItem value="success">Réussies</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="failed">Échouées</MenuItem>
            <MenuItem value="refunded">Remboursées</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {error && (
        <Box className="erreur-transactions" mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box className="spinner-center"><CircularProgress color="success" /></Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Référence</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Utilisateur</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Montant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Méthode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map(t => (
                    <TableRow key={t.id} hover sx={{ '&:hover': { backgroundColor: '#f0fdf4' } }}>
                      <TableCell>
                        <span className="tx-ref">{t.reference}</span>
                      </TableCell>
                      <TableCell>
                        <div className="tx-user-nom">{t.userNom}</div>
                        <div className="email-user">{t.userEmail}</div>
                      </TableCell>
                      <TableCell>
                        <span className="tx-montant">
                          {(t.montant || 0).toLocaleString('fr-FR')} {t.devise || 'XOF'}
                        </span>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.83rem', color: '#64748b' }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={METHOD_MAP[t.methode] || t.methode || '—'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(STATUS_MAP[t.statut] || { label: t.statut || '—' }).label}
                          color={(STATUS_MAP[t.statut] || { color: 'default' }).color}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="Lignes par page :"
          />
        </>
      )}
    </Box>
  );
};

export default TransactionsPage;
