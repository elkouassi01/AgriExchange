// src/pages/admin/TransactionsPage.jsx
import React, { useState, useEffect } from 'react';
import './TransactionsPage.css';
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
  Select,
  InputLabel,
  FormControl,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { fetchTransactions } from '../../services/adminService';

const TransactionsPage = () => {
  const { admin } = useAdminAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const data = await fetchTransactions();
        setTransactions(data);
        setLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des transactions');
        setLoading(false);
        console.error('Erreur:', error);
      }
    };

    loadTransactions();
  }, []);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch =
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.userId?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || transaction.statut === statusFilter;
    const matchesMethod = methodFilter === 'all' || transaction.methode === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'refunded': return 'info';
      default: return 'default';
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'mobile_money': return 'primary';
      case 'carte_credit': return 'secondary';
      case 'virement': return 'info';
      case 'admin': return 'success';
      default: return 'default';
    }
  };

  const handleExport = () => {
    alert("Fonctionnalité d'export à implémenter");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box className="page-transactions">
      <Box className="entete-transactions">
        <div>
          <Typography variant="h4" className="titre-transactions">
            Transactions
          </Typography>
          <Typography variant="body1" className="sous-titre-transactions">
            Historique des transactions de la plateforme
          </Typography>
        </div>

        <div className="actions-transactions">
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

      {/* Filtres */}
      <Paper className="filtres-transactions">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Rechercher une transaction..."
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
            <MenuItem value="completed">Complétées</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="failed">Échouées</MenuItem>
            <MenuItem value="refunded">Remboursées</MenuItem>
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Méthode</InputLabel>
          <Select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            label="Méthode"
          >
            <MenuItem value="all">Toutes les méthodes</MenuItem>
            <MenuItem value="mobile_money">Mobile Money</MenuItem>
            <MenuItem value="carte_credit">Carte de crédit</MenuItem>
            <MenuItem value="virement">Virement</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Résultats */}
      {loading ? (
        <Box className="spinner-center">
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Box className="erreur-transactions">
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>Référence</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell>Montant</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Méthode</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell>{transaction.reference}</TableCell>
                    <TableCell>
                      {transaction.userId?.nom ? (
                        <div>
                          <div>{transaction.userId.nom}</div>
                          <div className="email-user">{transaction.userId.email}</div>
                        </div>
                      ) : (
                        'Utilisateur inconnu'
                      )}
                    </TableCell>
                    <TableCell>{transaction.montant} XOF</TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.methode}
                        color={getMethodColor(transaction.methode)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.statut}
                        color={getStatusColor(transaction.statut)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => alert(`Détails de la transaction ${transaction.reference}`)}
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
            count={filteredTransactions.length}
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

export default TransactionsPage;
