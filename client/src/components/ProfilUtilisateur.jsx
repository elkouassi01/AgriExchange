import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfilUtilisateur.css';
import { useUser } from '../contexts/UserContext';
import api from '../services/axiosConfig';

const TYPE_EXPLOITATION_OPTIONS = [
  'Maraîchage', 'Arboriculture', 'Élevage bovin', 'Élevage ovin',
  'Élevage porcin', 'Aviculture', 'Agriculture mixte', 'Autre',
];

const ProfilUtilisateur = () => {
  const { user, refreshUserData } = useUser();
  const navigate = useNavigate();

  const [edition, setEdition] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [formData, setFormData] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const photoInputRef = React.useRef(null);

  if (!user) {
    return (
      <div className="profil-wrap">
        <div className="profil-error-box">
          <p>Vous devez être connecté pour accéder à votre profil.</p>
          <button className="profil-btn profil-btn--primary" onClick={() => navigate('/login')}>
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const isFarmer = user.role === 'agriculteur';

  const startEdit = () => {
    setFormData({
      nom: user.nom || '',
      contact: user.contact || '',
      fermeNom: user.fermeNom || '',
      localisation: user.localisation || '',
      typeExploitation: user.typeExploitation || '',
      surface: user.surface || '',
      description: user.description || '',
    });
    setSaveError('');
    setEdition(true);
  };

  const cancelEdit = () => {
    setEdition(false);
    setSaveError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nom?.trim()) {
      setSaveError('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await api.put('/auth/profil', formData);
      await refreshUserData();
      setEdition(false);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const clearPhotoFeedback = () => { setPhotoError(''); setPhotoSuccess(''); };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    clearPhotoFeedback();
    setPhotoUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      await api.post('/auth/photo-profil', fd);
      await refreshUserData();
      setPhotoSuccess('Photo mise à jour.');
      setTimeout(() => setPhotoSuccess(''), 3000);
    } catch (err) {
      setPhotoError(err.response?.data?.message || "Erreur lors de l'upload.");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    clearPhotoFeedback();
    setPhotoUploading(true);
    try {
      await api.delete('/auth/photo-profil');
      await refreshUserData();
      setPhotoSuccess('Photo supprimée.');
      setTimeout(() => setPhotoSuccess(''), 3000);
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const planMeta = user.abonnement?.formule
    ? { BLEU: { color: '#2563eb', bg: '#dbeafe' }, GOLD: { color: '#d97706', bg: '#fef9c3' }, PLATINUM: { color: '#7c3aed', bg: '#ede9fe' } }[user.abonnement.formule]
    : null;

  const dashboardPath =
    user.role === 'agriculteur' ? '/profil-agriculteur' :
    user.role === 'admin'       ? '/admin/dashboard' :
                                  '/profil-consommateur';

  return (
    <div className="profil-wrap">
      <div className="profil-card">

        {/* Avatar + identité */}
        <div className="profil-hero">

          {/* Colonne avatar */}
          <div className="profil-avatar-col">
            <div className="profil-avatar">
              {photoUploading ? (
                <span className="profil-avatar__spinner" />
              ) : user.photo ? (
                <img src={user.photo} alt="Photo de profil" className="profil-avatar__img" />
              ) : (
                (user.nom || '?').charAt(0).toUpperCase()
              )}
            </div>

            <div className="profil-photo-actions">
              <button
                type="button"
                className="profil-photo-btn"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
              >
                {user.photo ? 'Changer' : '+ Photo'}
              </button>
              {user.photo && (
                <button
                  type="button"
                  className="profil-photo-btn profil-photo-btn--delete"
                  onClick={handleDeletePhoto}
                  disabled={photoUploading}
                >
                  Supprimer
                </button>
              )}
            </div>

            {photoError && <p className="profil-photo-msg profil-photo-msg--error">{photoError}</p>}
            {photoSuccess && <p className="profil-photo-msg profil-photo-msg--success">{photoSuccess}</p>}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="profil-hero-info">
            <h1 className="profil-name">{user.nom}</h1>
            <p className="profil-email">{user.email}</p>
            <div className="profil-badges">
              <span className={`profil-role-badge profil-role-badge--${user.role}`}>
                {user.role === 'agriculteur' ? '🌾 Agriculteur' : user.role === 'admin' ? '🛡 Admin' : '🛒 Acheteur'}
              </span>
              {user.estActif
                ? <span className="profil-status-badge profil-status-badge--active">● Actif</span>
                : <span className="profil-status-badge profil-status-badge--inactive">● Inactif</span>
              }
              {planMeta && (
                <span
                  className="profil-plan-badge"
                  style={{ color: planMeta.color, background: planMeta.bg }}
                >
                  ★ {user.abonnement.formule}
                </span>
              )}
            </div>
          </div>
          {!edition && (
            <button className="profil-btn profil-btn--edit" onClick={startEdit}>
              ✏️ Modifier
            </button>
          )}
        </div>

        {/* Affichage */}
        {!edition ? (
          <div className="profil-info-grid">
            <InfoRow label="Contact" value={user.contact} />
            <InfoRow label="Localisation" value={user.localisation} />
            {isFarmer && (
              <>
                <InfoRow label="Ferme" value={user.fermeNom} />
                <InfoRow label="Type d'exploitation" value={user.typeExploitation} />
                <InfoRow label="Surface" value={user.surface} />
                {user.description && <InfoRow label="Description" value={user.description} full />}
              </>
            )}
            <InfoRow label="Membre depuis" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
            {user.derniereConnexion && (
              <InfoRow label="Dernière connexion" value={new Date(user.derniereConnexion).toLocaleDateString('fr-FR')} />
            )}
          </div>
        ) : (
          /* Formulaire d'édition */
          <form className="profil-form" onSubmit={handleSave}>
            <div className="profil-form-row">
              <label>Nom complet *</label>
              <input
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className="profil-input"
                required
              />
            </div>
            <div className="profil-form-row">
              <label>Numéro de contact</label>
              <input
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className="profil-input"
                placeholder="+225 07 XX XX XX XX"
              />
            </div>
            <div className="profil-form-row">
              <label>Localisation</label>
              <input
                name="localisation"
                value={formData.localisation}
                onChange={handleChange}
                className="profil-input"
                placeholder="Ville, région…"
              />
            </div>
            {isFarmer && (
              <>
                <div className="profil-form-row">
                  <label>Nom de la ferme</label>
                  <input
                    name="fermeNom"
                    value={formData.fermeNom}
                    onChange={handleChange}
                    className="profil-input"
                  />
                </div>
                <div className="profil-form-row">
                  <label>Type d'exploitation</label>
                  <select
                    name="typeExploitation"
                    value={formData.typeExploitation}
                    onChange={handleChange}
                    className="profil-input"
                  >
                    <option value="">— Sélectionner —</option>
                    {TYPE_EXPLOITATION_OPTIONS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="profil-form-row">
                  <label>Surface cultivée</label>
                  <input
                    name="surface"
                    value={formData.surface}
                    onChange={handleChange}
                    className="profil-input"
                    placeholder="ex: 2 hectares"
                  />
                </div>
                <div className="profil-form-row profil-form-row--full">
                  <label>Description de la ferme</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="profil-input profil-textarea"
                    rows={3}
                    placeholder="Décrivez votre exploitation…"
                  />
                </div>
              </>
            )}

            {saveError && <p className="profil-save-error">{saveError}</p>}

            <div className="profil-form-actions">
              <button type="submit" className="profil-btn profil-btn--primary" disabled={saving}>
                {saving ? 'Sauvegarde…' : '💾 Enregistrer'}
              </button>
              <button type="button" className="profil-btn profil-btn--cancel" onClick={cancelEdit} disabled={saving}>
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Abonnement */}
        {isFarmer && user.abonnement?.formule && (
          <div className="profil-abo-section">
            <h3 className="profil-section-title">Abonnement</h3>
            <div className="profil-abo-card" style={{ borderColor: planMeta?.color }}>
              <span className="profil-abo-formule" style={{ color: planMeta?.color }}>
                {user.abonnement.formule}
              </span>
              <span className="profil-abo-statut">
                {user.abonnement.statut === 'actif' ? '✅ Actif' : '⏸ ' + (user.abonnement.statut || 'Inconnu')}
              </span>
              {user.abonnement.dateFin && (
                <span className="profil-abo-date">
                  Expire le {new Date(user.abonnement.dateFin).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Retour au dashboard */}
        <div className="profil-footer">
          <button
            className="profil-btn profil-btn--back"
            onClick={() => navigate(dashboardPath)}
          >
            ← Retour au tableau de bord
          </button>
        </div>

      </div>
    </div>
  );
};

const InfoRow = ({ label, value, full }) => {
  if (!value) return null;
  return (
    <div className={`profil-info-row${full ? ' profil-info-row--full' : ''}`}>
      <span className="profil-info-label">{label}</span>
      <span className="profil-info-value">{value}</span>
    </div>
  );
};

export default ProfilUtilisateur;
