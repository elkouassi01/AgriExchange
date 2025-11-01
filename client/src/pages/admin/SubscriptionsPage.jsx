// src/pages/admin/SubscriptionsPage.jsx
import React, { useState, useEffect } from 'react';
import './SubscriptionsPage.css';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { fetchSubscriptions } from '../../services/adminService';

const SubscriptionsPage = () => {
  const { admin } = useAdminAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    cancelled: 0
  });

  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        setLoading(true);
        const data = await fetchSubscriptions();
        setSubscriptions(data);
        calculateStats(data);
        setLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des abonnements');
        setLoading(false);
        console.error('Erreur:', error);
      }
    };

    loadSubscriptions();
  }, []);

  const calculateStats = (data) => {
    const total = data.length;
    const active = data.filter(sub => sub.status === 'active').length;
    const expired = data.filter(sub => sub.status === 'expired').length;
    const cancelled = data.filter(sub => sub.status === 'cancelled').length;

    setStats({ total, active, expired, cancelled });
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch =
      subscription.user?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.reference.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const paginatedSubscriptions = filteredSubscriptions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'expired': return 'error';
      case 'cancelled': return 'default';
      default: return 'info';
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case 'BLEU': return 'info';
      case 'GOLD': return 'warning';
      case 'PLATINUM': return 'primary';
      default: return 'default';
    }
  };

  const handleExport = () => {
    alert("Fonctionnalité d'export à implémenter");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  return (
    <Box className="page-abonnements">
      <Box className="en-tete-abonnements">
        <div>
          <Typography variant="h4" className="titre-page">
            Abonnements
          </Typography>
          <Typography variant="body1" className="sous-titre-page">
            Gestion des abonnements des utilisateurs
          </Typography>
        </div>

        <div className="actions-abonnements">
          <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport}>
            Exporter
          </Button>
          <Tooltip title="Rafraîchir">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </div>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>Total</Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>Actifs</Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>Expirés</Typography>
              <Typography variant="h4" color="error.main">{stats.expired}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>Annulés</Typography>
              <Typography variant="h4">{stats.cancelled}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper className="filtres-abonnements">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Rechercher un abonnement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" />,
          }}
        />

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Statut"
          >
            <MenuItem value="all">Tous les statuts</MenuItem>
            <MenuItem value="active">Actif</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="expired">Expiré</MenuItem>
            <MenuItem value="cancelled">Annulé</MenuItem>
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Formule</InputLabel>
          <Select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            label="Formule"
          >
            <MenuItem value="all">Toutes les formules</MenuItem>
            <MenuItem value="BLEU">BLEU</MenuItem>
            <MenuItem value="GOLD">GOLD</MenuItem>
            <MenuItem value="PLATINUM">PLATINUM</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {loading ? (
        <Box className="spinner-center">
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Box className="message-erreur">
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Formule</TableCell>
                  <TableCell>Référence</TableCell>
                  <TableCell>Date de début</TableCell>
                  <TableCell>Date de fin</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSubscriptions.map((subscription) => (
                  <TableRow key={subscription._id}>
                    <TableCell>
                      {subscription.user?.nom ? (
                        <div>
                          <div>{subscription.user.nom}</div>
                          <div className="cellule-email">{subscription.user.email}</div>
                        </div>
                      ) : (
                        'Utilisateur inconnu'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={subscription.plan} color={getPlanColor(subscription.plan)} size="small" />
                    </TableCell>
                    <TableCell>{subscription.reference}</TableCell>
                    <TableCell>{formatDate(subscription.startDate)}</TableCell>
                    <TableCell>{formatDate(subscription.endDate)}</TableCell>
                    <TableCell>
                      <Chip label={subscription.status} color={getStatusColor(subscription.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => alert(`Détails de l'abonnement ${subscription.reference}`)}
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredSubscriptions.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Lignes par page:"
          />
        </>
      )}
    </Box>
  );
};

export default SubscriptionsPage;
