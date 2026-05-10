import React, { useState, useEffect, useMemo } from 'react';
import './UsersPage.css';
import { fetchUsers, updateUserStatus, deleteUser, createUser, changeUserRole, suspendUser } from '../../services/adminService';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider,
  IconButton, MenuItem, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  InfoOutlined,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  LockOpen as UnblockIcon,
  ToggleOn as ActivateIcon,
  ToggleOff as DeactivateIcon,
} from '@mui/icons-material';

const ROLE_CONFIG = {
  agriculteur: { label: 'Agriculteur', color: '#16a34a', bg: '#dcfce7' },
  consommateur: { label: 'Acheteur',    color: '#2563eb', bg: '#dbeafe' },
  admin:        { label: 'Admin',       color: '#7c3aed', bg: '#ede9fe' },
};

const PLAN_CONFIG = {
  BLEU:     { color: '#2563eb', bg: '#dbeafe' },
  GOLD:     { color: '#b45309', bg: '#fef3c7' },
  PLATINUM: { color: '#7c3aed', bg: '#ede9fe' },
};

const avatarBg = (role) => ROLE_CONFIG[role]?.color || '#6b7280';

const PAGE_SIZE = 15;

const UsersPage = () => {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [roleFilter, setRoleFilter]     = useState('tous');
  const [page, setPage]                 = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDelete, setOpenDelete]     = useState(false);
  const [detailUser, setDetailUser]     = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Création
  const [openCreate, setOpenCreate]   = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const emptyForm = { nom: '', email: '', contact: '', motDePasse: '', role: 'consommateur', fermeNom: '', localisation: '' };
  const [createForm, setCreateForm]   = useState(emptyForm);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetchUsers();
      const list = Array.isArray(res) ? res : (res.data || []);
      setUsers(list);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    let r = users;
    if (roleFilter !== 'tous') r = r.filter(u => u.role === roleFilter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter(u =>
        (u.nom || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.contact || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchTerm, roleFilter]);

  const counts = useMemo(() => ({
    tous:        users.length,
    agriculteur: users.filter(u => u.role === 'agriculteur').length,
    consommateur:users.filter(u => u.role === 'consommateur').length,
    admin:       users.filter(u => u.role === 'admin').length,
    actif:       users.filter(u => u.estActif).length,
    suspendu:    users.filter(u => u.suspended).length,
  }), [users]);

  /* ── Actions ── */
  const handleToggleStatus = async (userId, current) => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, !current);
      setUsers(p => p.map(u => u.id === userId ? { ...u, estActif: !current } : u));
      if (detailUser?.id === userId) setDetailUser(d => ({ ...d, estActif: !current }));
    } catch { setError('Erreur mise à jour statut'); }
    finally  { setActionLoading(null); }
  };

  const handleToggleSuspend = async (userId, current) => {
    setActionLoading(userId + '_sus');
    try {
      await suspendUser(userId, !current);
      setUsers(p => p.map(u => u.id === userId ? { ...u, suspended: !current } : u));
      if (detailUser?.id === userId) setDetailUser(d => ({ ...d, suspended: !current }));
    } catch { setError('Erreur suspension'); }
    finally  { setActionLoading(null); }
  };

  const handleChangeRole = async (userId, role) => {
    setActionLoading(userId + '_role');
    try {
      await changeUserRole(userId, role);
      setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u));
      if (detailUser?.id === userId) setDetailUser(d => ({ ...d, role }));
    } catch { setError('Erreur changement de rôle'); }
    finally  { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setUsers(p => p.filter(u => u.id !== selectedUser.id));
      setOpenDelete(false);
      setSelectedUser(null);
    } catch { setError("Erreur suppression"); }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await createUser(createForm);
      setUsers(p => [...p, res.data]);
      setOpenCreate(false);
      setCreateForm(emptyForm);
    } catch (e) { setCreateError(e.message); }
    finally     { setCreateLoading(false); }
  };

  /* ── Render ── */
  return (
    <Box className="users-page">

      {/* Header */}
      <div className="up-header">
        <div>
          <h1 className="up-title">Gestion des utilisateurs</h1>
          <p className="up-sub">{users.length} comptes inscrits sur VivriMarket</p>
        </div>
        <button className="up-btn-create" onClick={() => { setCreateForm(emptyForm); setCreateError(''); setOpenCreate(true); }}>
          <PersonAddIcon style={{ fontSize: 18 }} />
          Nouvel utilisateur
        </button>
      </div>

      {error && <div className="up-error">{error}</div>}

      {/* Stat chips */}
      <div className="up-stats">
        {[
          { label: 'Total',        value: counts.tous,        emoji: '👥', cls: '' },
          { label: 'Agriculteurs', value: counts.agriculteur, emoji: '🌾', cls: 'green' },
          { label: 'Acheteurs',    value: counts.consommateur,emoji: '🛒', cls: 'blue' },
          { label: 'Admins',       value: counts.admin,       emoji: '🛡️', cls: 'purple' },
          { label: 'Actifs',       value: counts.actif,       emoji: '✅', cls: 'emerald' },
          ...(counts.suspendu > 0 ? [{ label: 'Suspendus', value: counts.suspendu, emoji: '⛔', cls: 'orange' }] : []),
        ].map(s => (
          <div key={s.label} className={`up-stat up-stat--${s.cls}`}>
            <span className="up-stat__emoji">{s.emoji}</span>
            <span className="up-stat__val">{s.value}</span>
            <span className="up-stat__lbl">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="up-filters">
        <div className="up-search">
          <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
          <input
            className="up-search__input"
            placeholder="Rechercher par nom, email, contact…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="up-search__clear" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>
        <div className="up-role-tabs">
          {['tous','agriculteur','consommateur','admin'].map(r => (
            <button
              key={r}
              className={`up-role-tab ${roleFilter === r ? 'up-role-tab--active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'tous' ? 'Tous' : ROLE_CONFIG[r]?.label}
              <span className="up-role-tab__count">
                {r === 'tous' ? counts.tous : counts[r]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="up-loading">
          <CircularProgress color="success" size={36} />
          <p>Chargement…</p>
        </div>
      ) : (
        <div className="up-table-wrap">
          <table className="up-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Rôle</th>
                <th>Plan</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="up-empty">Aucun utilisateur trouvé</td></tr>
              ) : paginated.map(u => {
                const rc = ROLE_CONFIG[u.role] || { label: u.role, color: '#6b7280', bg: '#f1f5f9' };
                const pc = u.abonnement?.formule ? PLAN_CONFIG[u.abonnement.formule] : null;
                return (
                  <tr key={u.id} className="up-row">
                    {/* Utilisateur */}
                    <td className="up-cell up-cell--user">
                      <div className="up-avatar" style={{ background: avatarBg(u.role) }}>
                        {(u.nom || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="up-user-info">
                        <span className="up-user-name">{u.nom || '—'}</span>
                        <span className="up-user-email">{u.email}</span>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="up-cell up-cell--contact">{u.contact || '—'}</td>
                    {/* Rôle */}
                    <td className="up-cell">
                      <span className="up-badge" style={{ color: rc.color, background: rc.bg }}>
                        {rc.label}
                      </span>
                    </td>
                    {/* Plan */}
                    <td className="up-cell">
                      {pc ? (
                        <span className="up-badge" style={{ color: pc.color, background: pc.bg }}>
                          {u.abonnement.formule}
                        </span>
                      ) : <span className="up-muted">—</span>}
                    </td>
                    {/* Statut */}
                    <td className="up-cell">
                      <div className="up-status-wrap">
                        <span className={`up-dot ${u.estActif ? 'up-dot--on' : 'up-dot--off'}`} />
                        <span className="up-status-text">{u.estActif ? 'Actif' : 'Inactif'}</span>
                        {u.suspended && <span className="up-suspended-tag">Suspendu</span>}
                        {!u.isVerified && <span className="up-unverified-tag">?</span>}
                      </div>
                    </td>
                    {/* Inscription */}
                    <td className="up-cell up-cell--date">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    {/* Actions */}
                    <td className="up-cell up-cell--actions">
                      <Tooltip title="Détails / Changer rôle">
                        <IconButton size="small" onClick={() => setDetailUser(u)} sx={{ color: '#64748b' }}>
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.estActif ? 'Désactiver' : 'Activer'}>
                        <IconButton
                          size="small"
                          disabled={actionLoading === u.id}
                          onClick={() => handleToggleStatus(u.id, u.estActif)}
                          sx={{ color: u.estActif ? '#f59e0b' : '#16a34a' }}
                        >
                          {u.estActif ? <DeactivateIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.suspended ? 'Débloquer' : 'Suspendre'}>
                        <IconButton
                          size="small"
                          disabled={actionLoading === u.id + '_sus'}
                          onClick={() => handleToggleSuspend(u.id, u.suspended)}
                          sx={{ color: u.suspended ? '#16a34a' : '#ef4444' }}
                        >
                          {u.suspended ? <UnblockIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          onClick={() => { setSelectedUser(u); setOpenDelete(true); }}
                          sx={{ color: '#dc2626' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="up-pagination">
              <span className="up-pagination__info">
                {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} sur {filtered.length}
              </span>
              <div className="up-pagination__btns">
                <button className="up-page-btn" disabled={page === 1} onClick={() => setPage(p => p-1)}>‹ Préc.</button>
                {Array.from({ length: totalPages }, (_, i) => i+1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i-1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) => p === '…'
                    ? <span key={`e${i}`} className="up-page-ellipsis">…</span>
                    : <button key={p} className={`up-page-btn ${page === p ? 'up-page-btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  )
                }
                <button className="up-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p+1)}>Suiv. ›</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal détail */}
      <Dialog open={Boolean(detailUser)} onClose={() => setDetailUser(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {detailUser && (() => {
          const rc = ROLE_CONFIG[detailUser.role] || { label: detailUser.role, color: '#6b7280', bg: '#f1f5f9' };
          return <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, pt: 2 }}>
              <div className="up-avatar" style={{ background: avatarBg(detailUser.role), width: 48, height: 48, fontSize: '1.2rem', flexShrink: 0 }}>
                {(detailUser.nom || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <Typography fontWeight={700} fontSize="1rem">{detailUser.nom || '—'}</Typography>
                <Typography fontSize="0.8rem" color="text.secondary">{detailUser.email}</Typography>
              </div>
              <span className="up-badge" style={{ color: rc.color, background: rc.bg, fontSize: '0.75rem' }}>{rc.label}</span>
              <IconButton size="small" onClick={() => setDetailUser(null)}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2 }}>
              <div className="detail-grid">
                <span className="detail-label">Contact</span><span className="detail-value">{detailUser.contact || '—'}</span>
                {detailUser.localisation && <><span className="detail-label">Localisation</span><span className="detail-value">{detailUser.localisation}</span></>}
                {detailUser.fermeNom     && <><span className="detail-label">Ferme</span><span className="detail-value">{detailUser.fermeNom}</span></>}
                <div className="detail-divider" />
                <span className="detail-label">Compte</span>
                <span className="detail-value">
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <Chip label={detailUser.estActif ? 'Actif' : 'Inactif'} size="small" sx={{ backgroundColor: detailUser.estActif ? '#dcfce7':'#fee2e2', color: detailUser.estActif ? '#15803d':'#b91c1c', fontWeight:700, fontSize:'0.72rem' }} />
                    <Chip label={detailUser.isVerified ? 'Vérifié':'Non vérifié'} size="small" sx={{ backgroundColor: detailUser.isVerified ? '#dbeafe':'#fef9c3', color: detailUser.isVerified ? '#1d4ed8':'#92400e', fontWeight:600, fontSize:'0.72rem' }} />
                    {detailUser.suspended && <Chip label="Suspendu" size="small" sx={{ backgroundColor:'#fee2e2', color:'#b91c1c', fontWeight:700, fontSize:'0.72rem' }} />}
                  </div>
                </span>
                <div className="detail-divider" />
                <span className="detail-label">Inscription</span>
                <span className="detail-value">{detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '—'}</span>
                {detailUser.derniereConnexion && <><span className="detail-label">Dernière cnx</span><span className="detail-value">{new Date(detailUser.derniereConnexion).toLocaleDateString('fr-FR')}</span></>}
              </div>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1, flexWrap:'wrap' }}>
              <Select size="small" value={detailUser.role} disabled={actionLoading === detailUser.id+'_role'} onChange={e => handleChangeRole(detailUser.id, e.target.value)} sx={{ fontSize:'0.82rem', minWidth:140 }}>
                <MenuItem value="consommateur">Acheteur</MenuItem>
                <MenuItem value="agriculteur">Agriculteur</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
              <Button variant="outlined" color={detailUser.estActif ? 'warning':'success'} size="small" disabled={actionLoading === detailUser.id} onClick={() => handleToggleStatus(detailUser.id, detailUser.estActif)} sx={{ textTransform:'none', fontSize:'0.82rem' }}>
                {detailUser.estActif ? 'Désactiver':'Activer'}
              </Button>
              <Button variant="outlined" color={detailUser.suspended ? 'success':'warning'} size="small" disabled={actionLoading === detailUser.id+'_sus'} onClick={() => handleToggleSuspend(detailUser.id, detailUser.suspended)} sx={{ textTransform:'none', fontSize:'0.82rem' }}>
                {detailUser.suspended ? 'Débloquer':'Suspendre'}
              </Button>
              <Button variant="contained" color="error" size="small" onClick={() => { setSelectedUser(detailUser); setDetailUser(null); setOpenDelete(true); }} sx={{ textTransform:'none', fontSize:'0.82rem' }}>
                Supprimer
              </Button>
            </DialogActions>
          </>;
        })()}
      </Dialog>

      {/* Modal création */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', pb:1 }}>
          <Typography fontWeight={700}>Nouvel utilisateur</Typography>
          <IconButton size="small" onClick={() => setOpenCreate(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt:2, display:'flex', flexDirection:'column', gap:1.5 }}>
          {createError && <Typography color="error" fontSize="0.85rem">{createError}</Typography>}
          <TextField label="Nom complet" size="small" fullWidth required value={createForm.nom} onChange={e => setCreateForm(f=>({...f,nom:e.target.value}))} />
          <TextField label="Email" size="small" fullWidth required type="email" value={createForm.email} onChange={e => setCreateForm(f=>({...f,email:e.target.value}))} />
          <TextField label="Contact (téléphone)" size="small" fullWidth required value={createForm.contact} onChange={e => setCreateForm(f=>({...f,contact:e.target.value}))} />
          <TextField label="Mot de passe" size="small" fullWidth required type="password" value={createForm.motDePasse} onChange={e => setCreateForm(f=>({...f,motDePasse:e.target.value}))} />
          <Select size="small" fullWidth value={createForm.role} onChange={e => setCreateForm(f=>({...f,role:e.target.value}))}>
            <MenuItem value="consommateur">Acheteur</MenuItem>
            <MenuItem value="agriculteur">Agriculteur</MenuItem>
            <MenuItem value="admin">Administrateur</MenuItem>
          </Select>
          {createForm.role === 'agriculteur' && <>
            <TextField label="Nom de la ferme" size="small" fullWidth value={createForm.fermeNom} onChange={e => setCreateForm(f=>({...f,fermeNom:e.target.value}))} />
            <TextField label="Localisation" size="small" fullWidth value={createForm.localisation} onChange={e => setCreateForm(f=>({...f,localisation:e.target.value}))} />
          </>}
        </DialogContent>
        <DialogActions sx={{ px:3, pb:2.5, gap:1 }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ textTransform:'none' }}>Annuler</Button>
          <Button variant="contained" disabled={createLoading || !createForm.nom || !createForm.email || !createForm.contact || !createForm.motDePasse} onClick={handleCreate} sx={{ background:'#16a34a','&:hover':{background:'#15803d'}, textTransform:'none', fontWeight:700 }}>
            {createLoading ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)} PaperProps={{ sx: { borderRadius:2 } }}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Supprimer <strong>{selectedUser?.nom}</strong>{selectedUser?.email ? ` (${selectedUser.email})` : ''} ?{' '}
            Cette action est <strong>irréversible</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px:2.5, pb:2 }}>
          <Button onClick={() => setOpenDelete(false)} sx={{ textTransform:'none' }}>Annuler</Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ textTransform:'none' }}>Supprimer définitivement</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default UsersPage;
