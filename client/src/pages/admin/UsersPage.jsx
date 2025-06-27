import React, { useState, useEffect } from 'react';
import './UsersPage.css';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { fetchUsers, updateUserStatus, deleteUser } from '../../services/adminService';
import { 
  DataGrid, 
  GridToolbarContainer, 
  GridToolbarExport, 
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector
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
  Paper,
  TextField,
  Tooltip,
  Typography 
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Visibility as VisibilityIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon
} from '@mui/icons-material';

const UsersPage = () => {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data);
        setFilteredUsers(data);
        setLoading(false);
      } catch (error) {
        setError('Erreur lors du chargement des utilisateurs');
        setLoading(false);
        console.error('Erreur:', error);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        (user.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const handleStatusChange = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'actif' ? 'inactif' : 'actif';
    try {
      await updateUserStatus(userId, newStatus);
      setUsers(users.map(user => 
        user._id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (error) {
      setError('Erreur lors de la mise à jour du statut');
      console.error('Erreur:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser._id);
      setUsers(users.filter(user => user._id !== selectedUser._id));
      setOpenDeleteDialog(false);
    } catch (error) {
      setError('Erreur lors de la suppression de l\'utilisateur');
      console.error('Erreur:', error);
    }
  };

  const openDeleteConfirmation = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const columns = [
    {
      field: 'nom',
      headerName: 'Nom',
      flex: 1,
      renderCell: (params) => (
        <div className="user-nom">
          <div className="user-avatar">{params.row.nom?.charAt(0) || '?'}</div>
          <div>
            <div className="user-nom-principal">{params.row.nom}</div>
            <div className="user-email">{params.row.email}</div>
          </div>
        </div>
      )
    },
    {
      field: 'contact',
      headerName: 'Contact',
      flex: 1,
      renderCell: (params) => <div className="user-contact">{params.row.contact}</div>
    },
    {
      field: 'role',
      headerName: 'Rôle',
      flex: 0.8,
      renderCell: (params) => (
        <Chip 
          label={params.row.role} 
          color={params.row.role === 'admin' ? 'primary' : params.row.role === 'agriculteur' ? 'success' : 'info'} 
          size="small" 
        />
      )
    },
    {
      field: 'status',
      headerName: 'Statut',
      flex: 0.8,
      renderCell: (params) => (
        <Chip 
          label={params.row.status} 
          color={params.row.status === 'actif' ? 'success' : 'error'} 
          size="small" 
        />
      )
    },
    {
      field: 'createdAt',
      headerName: 'Date d\'inscription',
      flex: 1,
      valueFormatter: (params) =>
        params?.value ? new Date(params.value).toLocaleDateString('fr-FR') : 'Non défini'

    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="user-actions">
          <Tooltip title="Voir les détails">
            <IconButton size="small" color="info">
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier">
            <IconButton size="small" color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'actif' ? 'Désactiver' : 'Activer'}>
            <Button 
              size="small" 
              variant="outlined"
              color={params.row.status === 'actif' ? 'warning' : 'success'}
              onClick={() => handleStatusChange(params.row._id, params.row.status)}
            >
              {params.row.status === 'actif' ? 'Désactiver' : 'Activer'}
            </Button>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => openDeleteConfirmation(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      )
    }
  ];

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport />
      </GridToolbarContainer>
    );
  }

  return (
    <Box className="users-page">
      <Box className="users-header">
        <Typography variant="h4">Gestion des Utilisateurs</Typography>
        <Typography variant="body1">Gérez tous les utilisateurs de la plateforme AgriConnect</Typography>
      </Box>

      <Paper className="users-search-bar">
        <TextField
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />

        <Button variant="contained" color="primary" startIcon={<PersonAddIcon />}>
          Ajouter un utilisateur
        </Button>
      </Paper>

      {loading ? (
        <Box className="users-loading">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box className="users-error">
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Box className="users-table">
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row._id}
            pageSize={pageSize}
            onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
            rowsPerPageOptions={[5, 10, 25]}
            pagination
            disableSelectionOnClick
            components={{ Toolbar: CustomToolbar }}
            localeText={{
              toolbarExport: 'Exporter',
              toolbarExportCSV: 'Exporter en CSV',
              toolbarExportPrint: 'Imprimer',
              toolbarFilters: 'Filtres',
              toolbarColumns: 'Colonnes',
              toolbarDensity: 'Densité',
              noRowsLabel: 'Aucun utilisateur trouvé',
              footerRowSelected: (count) =>
                `${count.toLocaleString()} utilisateur${count !== 1 ? 's' : ''} sélectionné${count !== 1 ? 's' : ''}`,
            }}
            sx={{
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f5f5f5' },
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.5)' },
            }}
          />
        </Box>
      )}

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.nom}</strong> ({selectedUser?.email}) ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">Annuler</Button>
          <Button onClick={handleDeleteUser} color="error" autoFocus>Confirmer la suppression</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
