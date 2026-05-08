import React, { useState, useEffect } from 'react';
import './UsersPage.css';
import { fetchUsers, updateUserStatus, deleteUser } from '../../services/adminService';
import {
  DataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
} from '@mui/x-data-grid';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

const ROLE_LABELS = {
  agriculteur: { label: 'Agriculteur', color: 'success' },
  consommateur: { label: 'Consommateur', color: 'info' },
  admin: { label: 'Admin', color: 'secondary' },
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('tous');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      const list = Array.isArray(res) ? res : (res.data || []);
      setUsers(list);
      setFilteredUsers(list);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== 'tous') result = result.filter(u => u.role === roleFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.nom || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.contact || '').toLowerCase().includes(q)
      );
    }
    setFilteredUsers(result);
  }, [searchTerm, roleFilter, users]);

  const handleToggleStatus = async (userId, currentEstActif) => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, !currentEstActif);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, estActif: !currentEstActif } : u
      ));
    } catch {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      setOpenDeleteDialog(false);
      setSelectedUser(null);
    } catch {
      setError("Erreur lors de la suppression de l'utilisateur");
    }
  };

  const columns = [
    {
      field: 'nom',
      headerName: 'Utilisateur',
      flex: 1.4,
      minWidth: 200,
      renderCell: ({ row }) => (
        <div className="user-nom">
          <div className="user-avatar" style={{ background: avatarColor(row.role) }}>
            {(row.nom || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="user-nom-principal">{row.nom}</div>
            <div className="user-email">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'contact',
      headerName: 'Contact',
      flex: 1,
      minWidth: 130,
      renderCell: ({ row }) => <span className="user-contact">{row.contact || '—'}</span>,
    },
    {
      field: 'role',
      headerName: 'Rôle',
      flex: 0.8,
      minWidth: 120,
      renderCell: ({ row }) => {
        const r = ROLE_LABELS[row.role] || { label: row.role, color: 'default' };
        return <Chip label={r.label} color={r.color} size="small" />;
      },
    },
    {
      field: 'estActif',
      headerName: 'Statut',
      flex: 0.7,
      minWidth: 100,
      renderCell: ({ row }) => (
        <Chip
          label={row.estActif ? 'Actif' : 'Inactif'}
          color={row.estActif ? 'success' : 'default'}
          variant={row.estActif ? 'filled' : 'outlined'}
          size="small"
        />
      ),
    },
    {
      field: 'isVerified',
      headerName: 'Vérifié',
      flex: 0.6,
      minWidth: 90,
      renderCell: ({ row }) => (
        <Chip
          label={row.isVerified ? 'OUI' : 'NON'}
          color={row.isVerified ? 'success' : 'warning'}
          variant="outlined"
          size="small"
        />
      ),
    },
    {
      field: 'suspended',
      headerName: 'Suspendu',
      flex: 0.7,
      minWidth: 100,
      renderCell: ({ row }) =>
        row.role === 'agriculteur' ? (
          <Chip
            label={row.suspended ? 'OUI' : 'NON'}
            color={row.suspended ? 'error' : 'default'}
            variant={row.suspended ? 'filled' : 'outlined'}
            size="small"
          />
        ) : <span className="user-contact">—</span>,
    },
    {
      field: 'createdAt',
      headerName: 'Inscription',
      flex: 0.9,
      minWidth: 120,
      renderCell: ({ row }) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString('fr-FR')
          : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      minWidth: 160,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <div className="user-actions">
          <Tooltip title={row.estActif ? 'Désactiver' : 'Activer'}>
            <Button
              size="small"
              variant="outlined"
              color={row.estActif ? 'warning' : 'success'}
              disabled={actionLoading === row.id}
              onClick={() => handleToggleStatus(row.id, row.estActif)}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              {actionLoading === row.id ? '...' : (row.estActif ? 'Désactiver' : 'Activer')}
            </Button>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton
              size="small"
              color="error"
              onClick={() => { setSelectedUser(row); setOpenDeleteDialog(true); }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport csvOptions={{ fileName: 'utilisateurs-vivrimarket' }} />
      </GridToolbarContainer>
    );
  }

  const counts = {
    tous: users.length,
    agriculteur: users.filter(u => u.role === 'agriculteur').length,
    consommateur: users.filter(u => u.role === 'consommateur').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <Box className="users-page">
      <Box className="users-header">
        <Typography variant="h5" fontWeight={700}>Gestion des utilisateurs</Typography>
        <Typography variant="body2" color="text.secondary">
          {users.length} utilisateurs inscrits sur VivriMarket
        </Typography>
      </Box>

      {error && (
        <Box className="users-error" mb={2}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {/* Filtres */}
      <Paper className="users-search-bar">
        <TextField
          variant="outlined"
          size="small"
          placeholder="Rechercher par nom, email, contact..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
          sx={{ flex: 1 }}
        />
        <Select
          size="small"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="tous">Tous ({counts.tous})</MenuItem>
          <MenuItem value="agriculteur">Agriculteurs ({counts.agriculteur})</MenuItem>
          <MenuItem value="consommateur">Consommateurs ({counts.consommateur})</MenuItem>
          <MenuItem value="admin">Admins ({counts.admin})</MenuItem>
        </Select>
      </Paper>

      {loading ? (
        <Box className="users-loading">
          <CircularProgress color="success" />
        </Box>
      ) : (
        <Box className="users-table">
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={row => row.id}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            slots={{ toolbar: CustomToolbar }}
            localeText={{
              toolbarExport: 'Exporter',
              toolbarExportCSV: 'Exporter en CSV',
              toolbarExportPrint: 'Imprimer',
              toolbarFilters: 'Filtres',
              toolbarColumns: 'Colonnes',
              toolbarDensity: 'Densité',
              noRowsLabel: 'Aucun utilisateur trouvé',
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8fafc', fontWeight: 700 },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f0fdf4' },
            }}
          />
        </Box>
      )}

      {/* Dialog suppression */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Supprimer <strong>{selectedUser?.nom}</strong> ({selectedUser?.email}) ?
            Cette action est <strong>irréversible</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const avatarColor = (role) => {
  if (role === 'agriculteur') return '#dcfce7';
  if (role === 'consommateur') return '#dbeafe';
  if (role === 'admin') return '#f3e8ff';
  return '#f1f5f9';
};

export default UsersPage;
