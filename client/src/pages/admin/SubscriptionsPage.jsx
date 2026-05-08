import React, { useState, useEffect, useCallback } from 'react';
import './SubscriptionsPage.css';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination,
  Chip, Button, TextField, MenuItem, FormControl,
  InputLabel, Select, IconButton, Tooltip, CircularProgress, Grid, Card, CardContent,
} from '@mui/material';
import { FileDownload as ExportIcon, Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { fetchSubscriptions } from '../../services/adminService';

const FORMULE_COLOR = { BLEU: 'info', GOLD: 'warning', PLATINUM: 'secondary' };

const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const SubscriptionsPage = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formuleFilter, setFormuleFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchSubscriptions();
      const list = Array.isArray(res) ? res : (res.data || []);
      setSubscriptions(list);
      if (res.stats) setStats(res.stats);
    } catch {
      setError('Erreur lors du chargement des abonnements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subscriptions.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (s.userNom || '').toLowerCase().includes(q) ||
      (s.userEmail || '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active'    && s.isActive) ||
      (statusFilter === 'expired'   && !s.isActive && s.status !== 'cancelled') ||
      (statusFilter === 'cancelled' && s.status === 'cancelled') ||
      (statusFilter === 'pending'   && s.status === 'pending');
    const matchFormule = formuleFilter === 'all' || s.formule === formuleFilter;
    return matchSearch && matchStatus && matchFormule;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExportCSV = () => {
    const header = ['Utilisateur', 'Email', 'Formule', 'Montant', 'Début', 'Expiration', 'Statut'];
    const rows = filtered.map(s => [
      s.userNom, s.userEmail, s.formule, s.montant,
      fmt(s.dateDebut), fmt(s.dateExpiration),
      s.isActive ? 'Actif' : (s.status === 'cancelled' ? 'Annulé' : 'Expiré'),
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abonnements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ label, value, color, sub }) => (
    <Card sx={{ borderRadius: 2, border: '1px solid #f1f5f9' }} elevation={0}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="h4" fontWeight={800} color={color || 'text.primary'}>{value ?? '—'}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  );

  return (
    <Box className="page-abonnements">
      {/* En-tête */}
      <Box className="en-tete-abonnements">
        <div>
          <Typography variant="h5" fontWeight={700}>Abonnements</Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion des abonnements agriculteurs VivriMarket
          </Typography>
        </div>
        <div className="actions-abonnements">
          <Button variant="outlined" size="small" startIcon={<ExportIcon />} onClick={handleExportCSV}>
            Exporter CSV
          </Button>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </div>
      </Box>

      {/* Cartes stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Total" value={stats.total} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Actifs" value={stats.active} color="success.main" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Expirés" value={stats.expired} color="error.main" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="Annulés" value={stats.cancelled} color="text.secondary" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard label="En attente" value={stats.pending} color="warning.main" />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              label="Revenu total"
              value={`${(stats.totalRevenue || 0).toLocaleString('fr-FR')}`}
              color="success.main"
              sub="XOF"
            />
          </Grid>
          {/* Par formule */}
          <Grid item xs={4} sm={4} md={4}>
            <Card sx={{ borderRadius: 2, border: '1px solid #dbeafe' }} elevation={0}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">Par formule</Typography>
                <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                  <Chip label={`BLEU · ${stats.byFormule?.BLEU ?? 0}`} color="info" size="small" />
                  <Chip label={`GOLD · ${stats.byFormule?.GOLD ?? 0}`} color="warning" size="small" />
                  <Chip label={`PLATINUM · ${stats.byFormule?.PLATINUM ?? 0}`} color="secondary" size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtres */}
      <Paper className="filtres-abonnements">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Nom, email..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} label="Statut">
            <MenuItem value="all">Tous</MenuItem>
            <MenuItem value="active">Actifs</MenuItem>
            <MenuItem value="expired">Expirés</MenuItem>
            <MenuItem value="cancelled">Annulés</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Formule</InputLabel>
          <Select value={formuleFilter} onChange={e => { setFormuleFilter(e.target.value); setPage(0); }} label="Formule">
            <MenuItem value="all">Toutes</MenuItem>
            <MenuItem value="BLEU">BLEU</MenuItem>
            <MenuItem value="GOLD">GOLD</MenuItem>
            <MenuItem value="PLATINUM">PLATINUM</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {error && <Box className="message-erreur" mb={2}><Typography color="error">{error}</Typography></Box>}

      {loading ? (
        <Box className="spinner-center"><CircularProgress color="success" /></Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Utilisateur</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Formule</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Montant</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Début</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      Aucun abonnement trouvé
                    </TableCell>
                  </TableRow>
                ) : paginated.map(s => (
                  <TableRow key={s.id} hover sx={{ '&:hover': { backgroundColor: '#f0fdf4' } }}>
                    <TableCell>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.userNom}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.formule} color={FORMULE_COLOR[s.formule] || 'default'} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#16a34a', fontSize: '0.88rem' }}>
                      {(s.montant || 0).toLocaleString('fr-FR')} XOF
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#64748b' }}>{fmt(s.dateDebut)}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: s.isActive ? '#64748b' : '#dc2626' }}>
                      {fmt(s.dateExpiration)}
                    </TableCell>
                    <TableCell>
                      {s.status === 'cancelled' ? (
                        <Chip label="Annulé" color="default" size="small" />
                      ) : s.status === 'pending' ? (
                        <Chip label="En attente" color="warning" size="small" />
                      ) : s.isActive ? (
                        <Chip label="Actif" color="success" size="small" />
                      ) : (
                        <Chip label="Expiré" color="error" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

export default SubscriptionsPage;
