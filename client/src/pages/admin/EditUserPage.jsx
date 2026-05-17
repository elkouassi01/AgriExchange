import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound, User, Phone, Mail, MapPin, Sprout, ShieldCheck, ToggleLeft } from 'lucide-react';
import { getUserById, updateUserInfo, changeUserRole, resetUserPassword } from '../../services/adminService';
import './EditUserPage.css';

const TYPE_EXPLOITATION_OPTIONS = [
  { value: '', label: "Sélectionnez un type d'exploitation" },
  { value: 'cultures vivrières', label: 'Cultures vivrières (igname, manioc, maïs…)' },
  { value: 'maraîchage', label: 'Maraîchage (légumes, tomates, piments…)' },
  { value: 'cultures de rente', label: 'Cultures de rente (cacao, café, coton…)' },
  { value: 'élevage', label: 'Élevage (bovins, ovins, volaille…)' },
  { value: 'arboriculture', label: 'Arboriculture fruitière (mangue, anacarde…)' },
  { value: 'pisciculture', label: 'Pisciculture / Aquaculture' },
  { value: 'mixte', label: 'Exploitation mixte (plusieurs activités)' },
];

const ROLE_LABELS = { agriculteur: 'Agriculteur', consommateur: 'Acheteur', admin: 'Administrateur' };

const EditUserPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const [form, setForm] = useState({
    nom: '', email: '', contact: '', role: 'consommateur',
    estActif: true, isVerified: false,
    fermeNom: '', localisation: '', typeExploitation: '', surface: '', description: '',
  });

  const [pwdForm, setPwdForm]       = useState({ nouveau: '', confirmer: '' });
  const [showPwd, setShowPwd]       = useState(false);
  const [pwdError, setPwdError]     = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdSaving, setPwdSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUserById(id)
      .then((user) => {
        if (cancelled) return;
        setForm({
          nom:              user.nom             || '',
          email:            user.email           || '',
          contact:          user.contact         || '',
          role:             user.role            || 'consommateur',
          estActif:         user.estActif        ?? true,
          isVerified:       user.isVerified      ?? false,
          fermeNom:         user.fermeNom        || '',
          localisation:     user.localisation    || '',
          typeExploitation: user.typeExploitation || '',
          surface:          user.surface         || '',
          description:      user.description     || '',
        });
      })
      .catch(() => setError('Impossible de charger les données de cet utilisateur.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim())   return setError('Le nom est requis.');
    if (!form.email.trim()) return setError("L'email est requis.");

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUserInfo(id, {
        nom: form.nom.trim(),
        email: form.email.trim(),
        contact: form.contact.trim(),
        estActif: form.estActif,
        isVerified: form.isVerified,
        fermeNom: form.fermeNom || null,
        localisation: form.localisation || null,
        typeExploitation: form.typeExploitation || null,
        surface: form.surface || null,
        description: form.description || null,
      });
      await changeUserRole(id, form.role);
      setSuccess('Informations mises à jour avec succès.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (pwdForm.nouveau.length < 6) return setPwdError('Minimum 6 caractères.');
    if (pwdForm.nouveau !== pwdForm.confirmer) return setPwdError('Les mots de passe ne correspondent pas.');

    setPwdSaving(true);
    try {
      await resetUserPassword(id, pwdForm.nouveau);
      setPwdSuccess('Mot de passe réinitialisé avec succès.');
      setPwdForm({ nouveau: '', confirmer: '' });
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="eup-loading">
        <div className="eup-spinner" />
        <p>Chargement de l'utilisateur…</p>
      </div>
    );
  }

  const isAgriculteur = form.role === 'agriculteur';

  return (
    <div className="eup-container">

      {/* ── Header ── */}
      <div className="eup-header">
        <button className="eup-back" onClick={() => navigate('/admin/users')}>
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="eup-header__title">
          <div className="eup-avatar">
            {(form.nom || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="eup-title">Modification Infos utilisateur</h1>
            <p className="eup-sub">{form.email} — <span className="eup-role-chip">{ROLE_LABELS[form.role] || form.role}</span></p>
          </div>
        </div>
      </div>

      {/* ── Alertes globales ── */}
      {success && <div className="eup-alert eup-alert--success">{success}</div>}
      {error   && <div className="eup-alert eup-alert--error">{error}</div>}

      <div className="eup-grid">

        {/* ══ Colonne gauche ══ */}
        <form className="eup-card" onSubmit={handleSave}>

          {/* Section : Informations personnelles */}
          <div className="eup-section">
            <h2 className="eup-section__title">
              <User size={16} /> Informations personnelles
            </h2>

            <div className="eup-row">
              <div className="eup-field">
                <label>Nom complet *</label>
                <input type="text" value={form.nom} onChange={set('nom')} placeholder="Ex : Konan Kouamé" required />
              </div>
              <div className="eup-field">
                <label>Adresse email *</label>
                <div className="eup-input-icon">
                  <Mail size={15} />
                  <input type="email" value={form.email} onChange={set('email')} placeholder="exemple@email.com" required />
                </div>
              </div>
            </div>

            <div className="eup-row">
              <div className="eup-field">
                <label>Numéro de contact</label>
                <div className="eup-input-icon">
                  <Phone size={15} />
                  <input type="text" value={form.contact} onChange={set('contact')} placeholder="Ex : +22507000000" />
                </div>
              </div>
              <div className="eup-field">
                <label>Rôle</label>
                <select value={form.role} onChange={set('role')}>
                  <option value="consommateur">Acheteur</option>
                  <option value="agriculteur">Agriculteur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section : Statut du compte */}
          <div className="eup-section">
            <h2 className="eup-section__title">
              <ToggleLeft size={16} /> Statut du compte
            </h2>
            <div className="eup-toggles">
              <label className="eup-toggle">
                <input type="checkbox" checked={form.estActif} onChange={set('estActif')} />
                <span className="eup-toggle__slider" />
                <span className="eup-toggle__label">
                  Compte {form.estActif ? <strong className="eup-on">actif</strong> : <strong className="eup-off">inactif</strong>}
                </span>
              </label>
              <label className="eup-toggle">
                <input type="checkbox" checked={form.isVerified} onChange={set('isVerified')} />
                <span className="eup-toggle__slider" />
                <span className="eup-toggle__label">
                  Téléphone {form.isVerified ? <strong className="eup-on">vérifié</strong> : <strong className="eup-off">non vérifié</strong>}
                </span>
              </label>
            </div>
          </div>

          {/* Section : Informations agriculteur */}
          {isAgriculteur && (
            <div className="eup-section">
              <h2 className="eup-section__title">
                <Sprout size={16} /> Informations de la ferme
              </h2>

              <div className="eup-row">
                <div className="eup-field">
                  <label>Nom de la ferme</label>
                  <input type="text" value={form.fermeNom} onChange={set('fermeNom')} placeholder="Ex : Ferme de la Savane Verte" />
                </div>
                <div className="eup-field">
                  <label>Localisation</label>
                  <div className="eup-input-icon">
                    <MapPin size={15} />
                    <input type="text" value={form.localisation} onChange={set('localisation')} placeholder="Ex : Bouaké, Côte d'Ivoire" />
                  </div>
                </div>
              </div>

              <div className="eup-row">
                <div className="eup-field">
                  <label>Type d'exploitation</label>
                  <select value={form.typeExploitation} onChange={set('typeExploitation')}>
                    {TYPE_EXPLOITATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="eup-field">
                  <label>Surface exploitée <span className="eup-optional">(facultatif)</span></label>
                  <input type="text" value={form.surface} onChange={set('surface')} placeholder="Ex : 5 hectares" />
                </div>
              </div>

              <div className="eup-field eup-field--full">
                <label>Description de la ferme <span className="eup-optional">(facultatif)</span></label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={4}
                  placeholder="Décrivez la ferme, les méthodes de production, les denrées phares…"
                />
              </div>
            </div>
          )}

          {/* Bouton sauvegarde */}
          <div className="eup-actions">
            <button type="button" className="eup-btn eup-btn--cancel" onClick={() => navigate('/admin/users')}>
              Annuler
            </button>
            <button type="submit" className="eup-btn eup-btn--save" disabled={saving}>
              <Save size={16} />
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>

        {/* ══ Colonne droite ══ */}
        <div className="eup-right">

          {/* Réinitialisation mot de passe */}
          <div className="eup-card eup-card--pwd">
            <h2 className="eup-section__title">
              <KeyRound size={16} /> Réinitialiser le mot de passe
            </h2>
            <p className="eup-pwd-hint">
              Définissez un nouveau mot de passe pour cet utilisateur. Il devra le changer à sa prochaine connexion.
            </p>

            {pwdSuccess && <div className="eup-alert eup-alert--success">{pwdSuccess}</div>}
            {pwdError   && <div className="eup-alert eup-alert--error">{pwdError}</div>}

            <form onSubmit={handleResetPassword} className="eup-pwd-form">
              <div className="eup-field">
                <label>Nouveau mot de passe</label>
                <div className="password-input-container">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={pwdForm.nouveau}
                    onChange={(e) => { setPwdForm((f) => ({ ...f, nouveau: e.target.value })); setPwdError(''); }}
                    placeholder="Minimum 6 caractères"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? 'Masquer' : 'Afficher'}>
                    {showPwd ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="eup-field">
                <label>Confirmer le mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={pwdForm.confirmer}
                  onChange={(e) => { setPwdForm((f) => ({ ...f, confirmer: e.target.value })); setPwdError(''); }}
                  placeholder="Répétez le mot de passe"
                />
              </div>
              <button type="submit" className="eup-btn eup-btn--pwd" disabled={pwdSaving}>
                <KeyRound size={15} />
                {pwdSaving ? 'Réinitialisation…' : 'Réinitialiser'}
              </button>
            </form>
          </div>

          {/* Carte identité */}
          <div className="eup-card eup-card--info">
            <h2 className="eup-section__title">
              <ShieldCheck size={16} /> Récapitulatif
            </h2>
            <ul className="eup-info-list">
              <li><span>Rôle</span><strong>{ROLE_LABELS[form.role] || form.role}</strong></li>
              <li><span>Statut</span>
                <strong className={form.estActif ? 'eup-on' : 'eup-off'}>
                  {form.estActif ? 'Actif' : 'Inactif'}
                </strong>
              </li>
              <li><span>Téléphone</span>
                <strong className={form.isVerified ? 'eup-on' : 'eup-off'}>
                  {form.isVerified ? 'Vérifié' : 'Non vérifié'}
                </strong>
              </li>
              {isAgriculteur && form.fermeNom && (
                <li><span>Ferme</span><strong>{form.fermeNom}</strong></li>
              )}
              {isAgriculteur && form.localisation && (
                <li><span>Localisation</span><strong>{form.localisation}</strong></li>
              )}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditUserPage;
