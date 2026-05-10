import React, { useState, useEffect, useMemo } from 'react';
import './UsersPage.css';
import { fetchUsers, updateUserStatus, deleteUser, createUser, changeUserRole, suspendUser } from '../../services/adminService';
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
  Divider,
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
  InfoOutlined,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  CheckCircleOutline as UnblockIcon,
} from '@mui/icons-material';

const ROLE_LABELS = {
  agriculteur: { label: 'Agriculteur', color: 'success' },
  consommateur: { label: 'Acheteur', color: 'info' },
  admin: { label: 'Admin', color: 'secondary' },
};

const PLAN_COLORS = {
  BLEU: '#2563eb',
  GOLD: '#d97706',
  PLATINUM: '#7c3aed',
};

const avatarBg = (role) => {
  if (role === 'agriculteur') return '#16a34a';
  if (role === 'consommateur') return '#2563eb';
  if (role === 'admin') return '#7c3aed';
  return '#6b7280';
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
  const [detailUser, setDetailUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal création
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const emptyForm = { nom: '', email: '', contact: '', motDePasse: '', role: 'consommateur', fermeNom: '', localisation: '' };
  const [createForm, setCreateForm] = useState(emptyForm);

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

  const handleCreateUser = async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await createUser(createForm);
      setUsers(prev => [...prev, res.data]);
      setOpenCreate(false);
      setCreateForm(emptyForm);
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleChangeRole = async (userId, role) => {
    setActionLoading(userId + '_role');
    try {
      await changeUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      if (detailUser?.id === userId) setDetailUser(d => ({ ...d, role }));
    } catch {
      setError('Erreur lors du changement de rôle');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuspend = async (userId, currentSuspended) => {
    setActionLoading(userId + '_sus');
    try {
      await suspendUser(userId, !currentSuspended);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: !currentSuspended } : u));
      if (detailUser?.id === userId) setDetailUser(d => ({ ...d, suspended: !currentSuspended }));
    } catch {
      setError('Erreur lors de la suspension');
    } finally {
      setActionLoading(null);
    }
  };

  const counts = useMemo(() => ({
    tous: users.length,
    agriculteur: users.filter(u => u.role === 'agriculteur').length,
    consommateur: users.filter(u => u.role === 'consommateur').length,
    admin: users.filter(u => u.role === 'admin').length,
    actif: users.filter(u => u.estActif).length,
    suspendu: users.filter(u => u.suspended).length,
  }), [users]);

  const columns = [
    {
      field: 'nom',
      headerName: 'Utilisateur',
      flex: 1.5,
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className="user-nom">
          <div className="user-avatar" style={{ background: avatarBg(row.role) }}>
            {(row.nom || '?').charAt(0).toUpperCase()}
          </div>
          <div className="user-nom-info">
            <div className="user-nom-principal">{row.nom || '—'}</div>
            <div className="user-email">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      field: 'contact',
      headerName: 'Contact',
      flex: 0.9,
      minWidth: 130,
      renderCell: ({ row }) => <span className="user-contact">{row.contact || '—'}</span>,
    },
    {
      field: 'role',
      headerName: 'Rôle',
      flex: 0.75,
      minWidth: 120,
      renderCell: ({ row }) => {
        const r = ROLE_LABELS[row.role] || { label: row.role, color: 'default' };
        return <Chip label={r.label} color={r.color} size="small" />;
      },
    },
    {
      field: 'abonnement',
      headerName: 'Plan',
      flex: 0.7,
      minWidth: 100,
      sortable: false,
      renderCell: ({ row }) => {
        if (row.role !== 'agriculteur') return <span className="user-muted">—</span>;
        const formule = row.abonnement?.formule;
        if (!formule) return <span className="user-plan-none">Aucun</span>;
        return (
          <span
            className="user-plan-badge"
            style={{ color: PLAN_COLORS[formule] || '#6b7280', borderColor: PLAN_COLORS[formule] || '#e5e7eb' }}
          >
            {formule}
          </span>
        );
      },
    },
    {
      field: 'statut',
      headerName: 'Statut',
      flex: 1.1,
      minWidth: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="user-status-cell">
          <Chip
            label={row.estActif ? 'Actif' : 'Inactif'}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 22,
              backgroundColor: row.estActif ? '#dcfce7' : '#fee2e2',
              color: row.estActif ? '#15803d' : '#b91c1c',
              border: 'none',
            }}
          />
          <div className="user-status-flags">
            {row.isVerified
              ? <span className="status-flag status-flag--ok" title="Compte vérifié">✓</span>
              : <span className="status-flag status-flag--warn" title="Non vérifié">?</span>
            }
            {row.suspended && (
              <span className="status-flag status-flag--err" title="Compte suspendu">⚠</span>
            )}
          </div>
        </div>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Inscription',
      flex: 0.85,
      minWidth: 110,
      renderCell: ({ row }) =>
        row.createdAt
          ? <span className="user-date">{new Date(row.createdAt).toLocaleDateString('fr-FR')}</span>
          : <span className="user-muted">—</span>,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.95,
      minWidth: 150,
      sortable: false,
      filterable: false,
      renderCell: ({ row }) => (
        <div className="user-actions">
          <Tooltip title="Voir les détails / Changer rôle">
            <IconButton size="small" onClick={() => setDetailUser(row)}>
              <InfoOutlined fontSize="small" sx={{ color: '#6b7280' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.estActif ? 'Désactiver le compte' : 'Activer le compte'}>
            <Button
              size="small"
              variant="outlined"
              color={row.estActif ? 'warning' : 'success'}
              disabled={actionLoading === row.id}
              onClick={() => handleToggleStatus(row.id, row.estActif)}
              sx={{ textTransform: 'none', fontSize: '0.7rem', minWidth: 70, px: 1, height: 26 }}
            >
              {actionLoading === row.id ? '…' : (row.estActif ? 'Désactiver' : 'Activer')}
            </Button>
          </Tooltip>
          <Tooltip title={row.suspended ? 'Débloquer' : 'Suspendre'}>
            <IconButton
              size="small"
              disabled={actionLoading === row.id + '_sus'}
              onClick={() => handleToggleSuspend(row.id, row.suspended)}
              sx={{ color: row.suspended ? '#16a34a' : '#f59e0b' }}
            >
              {row.suspended ? <UnblockIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer l'utilisateur">
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
      <GridToolbarContainer sx={{ px: 1.5, py: 0.5 }}>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport csvOptions={{ fileName: 'utilisateurs-vivrimarket' }} />
      </GridToolbarContainer>
    );
  }

  return (
    <Box className="users-page">

      <Box className="users-header" sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <div>
          <Typography variant="h5" fontWeight={700} color="#1f2937">
            Gestion des utilisateurs
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {users.length} comptes inscrits sur VivriMarket
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => { setCreateForm(emptyForm); setCreateError(''); setOpenCreate(true); }}
          sx={{ background: '#16a34a', '&:hover': { background: '#15803d' }, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Nouvel utilisateur
        </Button>
      </Box>

      {error && (
        <Box className="users-error">
          <Typography color="error" fontSize="0.9rem">{error}</Typography>
        </Box>
      )}

      {/* Stat cards */}
      <div className="users-stats">
        <div className="ustat-card">
          <div className="ustat-icon ustat-icon--gray">👥</div>
          <div className="ustat-body">
            <span className="ustat-value">{counts.tous}</span>
            <span className="ustat-label">Total</span>
          </div>
        </div>
        <div className="ustat-card">
          <div className="ustat-icon ustat-icon--green">🌾</div>
          <div className="ustat-body">
            <span className="ustat-value">{counts.agriculteur}</span>
            <span className="ustat-label">Agriculteurs</span>
          </div>
        </div>
        <div className="ustat-card">
          <div className="ustat-icon ustat-icon--blue">🛒</div>
          <div className="ustat-body">
            <span className="ustat-value">{counts.consommateur}</span>
            <span className="ustat-label">Acheteurs</span>
          </div>
        </div>
        <div className="ustat-card">
          <div className="ustat-icon ustat-icon--emerald">✅</div>
          <div className="ustat-body">
            <span className="ustat-value">{counts.actif}</span>
            <span className="ustat-label">Actifs</span>
          </div>
        </div>
        {counts.suspendu > 0 && (
          <div className="ustat-card ustat-card--warn">
            <div className="ustat-icon ustat-icon--orange">⚠️</div>
            <div className="ustat-body">
              <span className="ustat-value ustat-value--warn">{counts.suspendu}</span>
              <span className="ustat-label">Suspendus</span>
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <Paper className="users-search-bar" elevation={0}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Rechercher par nom, email, contact…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
          sx={{ flex: 1 }}
        />
        <Select
          size="small"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          sx={{ minWidth: 190 }}
        >
          <MenuItem value="tous">Tous les rôles ({counts.tous})</MenuItem>
          <MenuItem value="agriculteur">Agriculteurs ({counts.agriculteur})</MenuItem>
          <MenuItem value="consommateur">Acheteurs ({counts.consommateur})</MenuItem>
          <MenuItem value="admin">Admins ({counts.admin})</MenuItem>
        </Select>
      </Paper>

      {loading ? (
        <Box className="users-loading">
          <CircularProgress color="success" />
          <Typography color="text.secondary" mt={1.5} fontSize="0.9rem">
            Chargement des utilisateurs…
          </Typography>
        </Box>
      ) : (
        <Box className="users-table">
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={row => row.id}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            pageSizeOptions={[10, 25, 50, 100]}
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
              footerRowSelected: (count) => `${count} ligne(s) sélectionnée(s)`,
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#f8fafc',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '2px solid #e5e7eb',
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#f0fdf4' },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f8fafc',
              },
            }}
          />
        </Box>
      )}

      {/* Modal détail utilisateur */}
      <Dialog
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {detailUser && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, pt: 2 }}>
              <div
                className="user-avatar"
                style={{ background: avatarBg(detailUser.role), width: 46, height: 46, fontSize: '1.15rem' }}
              >
                {(detailUser.nom || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <Typography fontWeight={700} fontSize="1rem">{detailUser.nom || '—'}</Typography>
                <Typography fontSize="0.8rem" color="text.secondary">{detailUser.email}</Typography>
              </div>
              <IconButton size="small" onClick={() => setDetailUser(null)} sx={{ ml: 1 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent sx={{ pt: 2, pb: 1 }}>
              <div className="detail-grid">
                <DetailRow label="Rôle">
                  <Chip
                    label={ROLE_LABELS[detailUser.role]?.label || detailUser.role}
                    color={ROLE_LABELS[detailUser.role]?.color || 'default'}
                    size="small"
                  />
                </DetailRow>
                <DetailRow label="Contact">{detailUser.contact || '—'}</DetailRow>
                {detailUser.localisation && (
                  <DetailRow label="Localisation">{detailUser.localisation}</DetailRow>
                )}
                {detailUser.fermeNom && (
                  <DetailRow label="Ferme">{detailUser.fermeNom}</DetailRow>
                )}
                {detailUser.typeExploitation && (
                  <DetailRow label="Exploitation">{detailUser.typeExploitation}</DetailRow>
                )}
                {detailUser.surface && (
                  <DetailRow label="Surface">{detailUser.surface}</DetailRow>
                )}
                {detailUser.description && (
                  <DetailRow label="Description">{detailUser.description}</DetailRow>
                )}

                <div className="detail-divider" />

                <DetailRow label="Compte">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Chip
                      label={detailUser.estActif ? 'Actif' : 'Inactif'}
                      size="small"
                      sx={{
                        backgroundColor: detailUser.estActif ? '#dcfce7' : '#fee2e2',
                        color: detailUser.estActif ? '#15803d' : '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                      }}
                    />
                    <Chip
                      label={detailUser.isVerified ? 'Vérifié' : 'Non vérifié'}
                      size="small"
                      sx={{
                        backgroundColor: detailUser.isVerified ? '#dbeafe' : '#fef9c3',
                        color: detailUser.isVerified ? '#1d4ed8' : '#92400e',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                      }}
                    />
                    {detailUser.suspended && (
                      <Chip
                        label="Suspendu"
                        size="small"
                        sx={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      />
                    )}
                  </div>
                </DetailRow>

                {detailUser.abonnement && (
                  <>
                    <div className="detail-divider" />
                    <DetailRow label="Formule">
                      <span
                        className="user-plan-badge"
                        style={{
                          color: PLAN_COLORS[detailUser.abonnement.formule] || '#6b7280',
                          borderColor: PLAN_COLORS[detailUser.abonnement.formule] || '#e5e7eb',
                        }}
                      >
                        {detailUser.abonnement.formule}
                      </span>
                    </DetailRow>
                    {detailUser.abonnement.dateExpiration && (
                      <DetailRow label="Expiration">
                        {new Date(detailUser.abonnement.dateExpiration).toLocaleDateString('fr-FR')}
                      </DetailRow>
                    )}
                    <DetailRow label="Statut abo.">
                      {detailUser.abonnement.status === 'actif' ? '✅ Actif' : detailUser.abonnement.status || '—'}
                    </DetailRow>
                  </>
                )}

                <div className="detail-divider" />

                <DetailRow label="Inscrit le">
                  {detailUser.createdAt
                    ? new Date(detailUser.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </DetailRow>
                {detailUser.derniereConnexion && (
                  <DetailRow label="Dernière connexion">
                    {new Date(detailUser.derniereConnexion).toLocaleDateString('fr-FR')}
                  </DetailRow>
                )}
              </div>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, flexWrap: 'wrap' }}>
              <Select
                size="small"
                value={detailUser.role}
                disabled={actionLoading === detailUser.id + '_role'}
                onChange={e => handleChangeRole(detailUser.id, e.target.value)}
                sx={{ fontSize: '0.82rem', minWidth: 140 }}
              >
                <MenuItem value="consommateur">Acheteur</MenuItem>
                <MenuItem value="agriculteur">Agriculteur</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
              <Button
                variant="outlined"
                color={detailUser.estActif ? 'warning' : 'success'}
                size="small"
                disabled={actionLoading === detailUser.id}
                onClick={() => handleToggleStatus(detailUser.id, detailUser.estActif)}
                sx={{ textTransform: 'none', fontSize: '0.82rem' }}
              >
                {detailUser.estActif ? 'Désactiver' : 'Activer'}
              </Button>
              <Button
                variant="outlined"
                color={detailUser.suspended ? 'success' : 'warning'}
                size="small"
                disabled={actionLoading === detailUser.id + '_sus'}
                onClick={() => handleToggleSuspend(detailUser.id, detailUser.suspended)}
                sx={{ textTransform: 'none', fontSize: '0.82rem' }}
              >
                {detailUser.suspended ? 'Débloquer' : 'Suspendre'}
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => { setSelectedUser(detailUser); setDetailUser(null); setOpenDeleteDialog(true); }}
                sx={{ textTransform: 'none', fontSize: '0.82rem' }}
              >
                Supprimer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal création utilisateur */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography fontWeight={700}>Nouvel utilisateur</Typography>
          <IconButton size="small" onClick={() => setOpenCreate(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {createError && <Typography color="error" fontSize="0.85rem">{createError}</Typography>}
          <TextField label="Nom complet" size="small" fullWidth required value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} />
          <TextField label="Email" size="small" fullWidth required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          <TextField label="Contact (téléphone)" size="small" fullWidth required value={createForm.contact} onChange={e => setCreateForm(f => ({ ...f, contact: e.target.value }))} />
          <TextField label="Mot de passe" size="small" fullWidth required type="password" value={createForm.motDePasse} onChange={e => setCreateForm(f => ({ ...f, motDePasse: e.target.value }))} />
          <Select size="small" fullWidth value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}>
            <MenuItem value="consommateur">Acheteur</MenuItem>
            <MenuItem value="agriculteur">Agriculteur</MenuItem>
            <MenuItem value="admin">Administrateur</MenuItem>
          </Select>
          {createForm.role === 'agriculteur' && <>
            <TextField label="Nom de la ferme" size="small" fullWidth value={createForm.fermeNom} onChange={e => setCreateForm(f => ({ ...f, fermeNom: e.target.value }))} />
            <TextField label="Localisation" size="small" fullWidth value={createForm.localisation} onChange={e => setCreateForm(f => ({ ...f, localisation: e.target.value }))} />
          </>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform: 'none' }}>Annuler</Button>
          <Button
            variant="contained"
            disabled={createLoading || !createForm.nom || !createForm.email || !createForm.contact || !createForm.motDePasse}
            onClick={handleCreateUser}
            sx={{ background: '#16a34a', '&:hover': { background: '#15803d' }, textTransform: 'none', fontWeight: 700 }}
          >
            {createLoading ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Supprimer <strong>{selectedUser?.nom}</strong>{selectedUser?.email ? ` (${selectedUser.email})` : ''} ?{' '}
            Cette action est <strong>irréversible</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" sx={{ textTransform: 'none' }}>
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

const DetailRow = ({ label, children }) => (
  <>
    <span className="detail-label">{label}</span>
    <span className="detail-value">{children}</span>
  </>
);

export default UsersPage;
