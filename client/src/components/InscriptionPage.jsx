import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Select from 'react-select';
import './InscriptionPage.css';
import useCallingCodes from '../hooks/useCallingCodes';
import { SERVER_BASE_URL, buildApiUrl } from '../config/api';
import { PROMO_FIN_AGRICULTEUR } from '../config/constants';

const FARMER_PLANS = {
  BLEU: {
    color: '#3498db',
    borderColor: '#2980b9',
    bgColor: '#ebf5fb',
    price: '500 FCFA / mois',
    duration: '1 mois',
    features: [
      "Jusqu'à 5 denrées publiées",
      'Profil de ferme basique',
      'Visibilité standard sur le marché',
      'Contact direct par les acheteurs',
    ],
    extraFields: [],
  },
  GOLD: {
    color: '#e67e22',
    borderColor: '#d35400',
    bgColor: '#fef9e7',
    price: '1 500 FCFA / 3 mois',
    duration: '3 mois',
    features: [
      "Jusqu'à 15 denrées publiées",
      'Profil enrichi avec description de ferme',
      'Visibilité améliorée dans les recherches',
      'Statistiques de consultation basiques',
      'Contact direct prioritaire',
    ],
    extraFields: ['surface', 'description'],
  },
  PLATINUM: {
    color: '#8e44ad',
    borderColor: '#7d3c98',
    bgColor: '#f5eef8',
    price: '3 000 FCFA / 6 mois',
    duration: '6 mois',
    features: [
      'Denrées illimitées',
      'Profil complet et optimisé',
      'Visibilité maximale — top des résultats',
      'Statistiques avancées et rapports',
      'Support client prioritaire 7j/7',
      'Badge "Ferme certifiée" sur le profil',
    ],
    extraFields: ['surface', 'description'],
  },
};

const CONSUMER_TARIFFS = { BLEU: '1 000 FCFA/mois', GOLD: '3 000 FCFA/mois', PLATINUM: '5 000 FCFA/mois' };
const CONSUMER_AMOUNTS = { BLEU: 1000, GOLD: 3000, PLATINUM: 5000 };

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

const InscriptionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || '';
  const formule = queryParams.get('formule') || '';

  const isPromo = type === 'agriculteur' && new Date() < PROMO_FIN_AGRICULTEUR;
  const planInfo = type === 'agriculteur' && FARMER_PLANS[formule] ? FARMER_PLANS[formule] : null;

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    confirmerMotDePasse: '',
    localisation: '',
    typeExploitation: '',
    fermeNom: '',
    contact: '',
    surface: '',
    description: '',
    accepteAccord: false,
  });

  const [indicatif, setIndicatif] = useState('+225');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showMotDePasse, setShowMotDePasse] = useState(false);
  const [showConfirmerMotDePasse, setShowConfirmerMotDePasse] = useState(false);

  const { callingCodes, loading: loadingCodes, error: errorCodes } = useCallingCodes();

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) newErrors.nom = 'Nom requis';
    else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.nom))
      newErrors.nom = 'Lettres et espaces uniquement';

    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Adresse email invalide';

    if (!formData.contact.trim()) newErrors.contact = 'Numéro requis';
    else if (/[^0-9]+/.test(formData.contact)) newErrors.contact = 'Chiffres uniquement';
    else if (formData.contact.length < 8) newErrors.contact = 'Numéro trop court (min 8 chiffres)';

    if (formData.motDePasse.length < 6)
      newErrors.motDePasse = 'Minimum 6 caractères';
    if (formData.motDePasse !== formData.confirmerMotDePasse)
      newErrors.confirmerMotDePasse = 'Les mots de passe ne correspondent pas';

    if (type === 'agriculteur') {
      if (!formData.fermeNom.trim()) newErrors.fermeNom = 'Nom de la ferme requis';
      if (!formData.localisation.trim()) newErrors.localisation = 'Localisation requise';
      if (!formData.typeExploitation) newErrors.typeExploitation = "Sélectionnez un type d'exploitation";
      if (!formData.accepteAccord) newErrors.accepteAccord = "Veuillez accepter les conditions d'utilisation";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError('');
    const fullPhone = indicatif + formData.contact;

    try {
      if (type === 'agriculteur' && isPromo) {
        const res = await fetch(buildApiUrl('/inscription-gratuite'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: formData.nom,
            email: formData.email,
            motDePasse: formData.motDePasse,
            contact: fullPhone,
            fermeNom: formData.fermeNom,
            localisation: formData.localisation,
            typeExploitation: formData.typeExploitation,
            surface: formData.surface || null,
            description: formData.description || null,
            formule: formule || 'BLEU',
          }),
        });

        const data = await res.json();
        if (res.ok && data.pendingVerification) {
          localStorage.setItem('pendingPhone', fullPhone);
          navigate('/verify-otp', { state: { telephone: fullPhone } });
        } else {
          setSubmitError(data.message || "Erreur lors de l'inscription");
        }
        return;
      }

      if (type === 'consommateur') {
        const res = await fetch(buildApiUrl('/auth/inscription-consommateur'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: formData.nom,
            email: formData.email,
            motDePasse: formData.motDePasse,
            contact: fullPhone,
          }),
        });
        const data = await res.json();
        if (res.ok && data.pendingVerification) {
          localStorage.setItem('pendingPhone', fullPhone);
          navigate('/verify-otp', { state: { telephone: fullPhone } });
        } else {
          setSubmitError(data.message || "Erreur lors de l'inscription");
        }
        return;
      }

      if (!type || !formule) {
        navigate('/offres');
        return;
      }

      const montant = CONSUMER_AMOUNTS[formule];
      if (!montant) {
        setSubmitError('Formule invalide. Choisissez une formule depuis la page des offres.');
        return;
      }

      const transaction_id = 'CP' + Date.now();
      const contactClean = fullPhone.replace(/\D/g, '');

      const paymentData = {
        apikey: '8937149296838988c80faf0.18612017',
        site_id: '105896693',
        transaction_id,
        amount: montant,
        currency: 'XOF',
        description: 'Abonnement ' + formule + ' (' + type + ')',
        customer_name: formData.nom.substring(0, 50),
        customer_email: formData.email,
        customer_phone_number: contactClean,
        notify_url: (SERVER_BASE_URL || window.location.origin) + '/api/v1/cinetpay-notify',
        return_url: window.location.origin + '/paiement-reussi',
        cancel_url: window.location.origin + '/paiement-echec',
        channels: 'ALL',
        metadata: JSON.stringify({ user_email: formData.email, user_type: type, subscription_plan: formule }),
        lang: 'fr',
      };

      const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      if (result.code === '201' && result.data?.payment_url) {
        window.location.href = result.data.payment_url;
      } else {
        setSubmitError(result.message || 'Erreur lors du paiement');
      }
    } catch (error) {
      setSubmitError('Erreur réseau : ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOptions = callingCodes.map((item) => ({
    value: item.code,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <img src={item.drapeau} alt={item.pays} width="20" height="14" />
        <span>{item.code} - {item.pays}</span>
      </div>
    ),
  }));

  const promoEndStr = PROMO_FIN_AGRICULTEUR.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const showSurface = planInfo && planInfo.extraFields.includes('surface');
  const showDescription = planInfo && planInfo.extraFields.includes('description');

  return (
    <div className="inscription-container">

      {/* ── Header ── */}
      <div className="inscription-header">
        <h1>
          {type === 'agriculteur' ? 'Inscription Agriculteur' : 'Inscription Consommateur'}
        </h1>

        {formule && (
          <div className={'formule-badge formule-badge--' + formule.toLowerCase()}>
            Formule {formule}
            {planInfo && (
              <span className="formule-badge-price">
                {isPromo ? ' — GRATUIT' : (' — ' + planInfo.price)}
              </span>
            )}
            {!planInfo && CONSUMER_TARIFFS[formule] && (
              <span className="formule-badge-price"> — {CONSUMER_TARIFFS[formule]}</span>
            )}
          </div>
        )}

        {isPromo && (
          <div className="inscription-promo-banner">
            <span className="inscription-promo-banner__icon">🎉</span>
            <div className="inscription-promo-banner__text">
              <strong>Inscription 100% GRATUITE</strong>
              <span>Offre valable jusqu'au {promoEndStr} — quelle que soit la formule</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Plan feature card ── */}
      {planInfo && (
        <div
          className={'plan-card plan-card--' + formule.toLowerCase()}
          style={{ borderColor: planInfo.borderColor, backgroundColor: planInfo.bgColor }}
        >
          <div className="plan-card__header">
            <span className="plan-card__label" style={{ color: planInfo.color }}>
              Formule {formule}
            </span>
            <span className="plan-card__duration">Abonnement {planInfo.duration}</span>
          </div>
          <ul className="plan-card__features">
            {planInfo.features.map((feat, i) => (
              <li key={i}>
                <span className="plan-card__check" style={{ color: planInfo.color }}>✓</span>
                {feat}
              </li>
            ))}
          </ul>
          {isPromo && (
            <div className="plan-card__promo-note">
              Prix habituel&nbsp;: <s>{planInfo.price}</s>&nbsp;→&nbsp;
              <strong className="plan-card__free">GRATUIT jusqu'au 31/12/2026</strong>
            </div>
          )}
        </div>
      )}

      {/* ── Form ── */}
      <form className="inscription-form" onSubmit={handleSubmit} noValidate>

        {/* Section — Informations personnelles */}
        <div className="form-section">
          <h3 className="form-section__title">Informations personnelles</h3>

          <div className="form-group">
            <label htmlFor="nom">Nom complet *</label>
            <input
              id="nom"
              type="text"
              name="nom"
              placeholder="Ex : Konan Kouamé"
              value={formData.nom}
              onChange={handleChange}
              className={errors.nom ? 'error' : ''}
            />
            {errors.nom && <p className="error-message">{errors.nom}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse email *</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Ex : konan@exemple.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <p className="error-message">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label>Numéro WhatsApp *</label>
            <div className="contact-row">
              {loadingCodes ? (
                <div className="loading-indicator">Chargement...</div>
              ) : errorCodes ? (
                <p className="country-load-warning">Erreur indicatifs</p>
              ) : (
                <Select
                  className="react-select-container"
                  classNamePrefix="react-select"
                  options={selectOptions}
                  value={selectOptions.find((o) => o.value === indicatif)}
                  onChange={(selected) => setIndicatif(selected.value)}
                  placeholder="Indicatif"
                />
              )}
              <input
                type="text"
                name="contact"
                placeholder="Ex : 0700000000"
                value={formData.contact}
                onChange={handleChange}
                className={errors.contact ? 'error' : ''}
              />
            </div>
            {errors.contact && <p className="error-message contact-error">{errors.contact}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="motDePasse">Mot de passe *</label>
            <div className="password-input-container">
              <input
                id="motDePasse"
                type={showMotDePasse ? 'text' : 'password'}
                name="motDePasse"
                placeholder="Minimum 6 caractères"
                value={formData.motDePasse}
                onChange={handleChange}
                className={errors.motDePasse ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowMotDePasse((v) => !v)}
                aria-label={showMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showMotDePasse ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.motDePasse && <p className="error-message">{errors.motDePasse}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmerMotDePasse">Confirmer le mot de passe *</label>
            <div className="password-input-container">
              <input
                id="confirmerMotDePasse"
                type={showConfirmerMotDePasse ? 'text' : 'password'}
                name="confirmerMotDePasse"
                placeholder="Répétez votre mot de passe"
                value={formData.confirmerMotDePasse}
                onChange={handleChange}
                className={errors.confirmerMotDePasse ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmerMotDePasse((v) => !v)}
                aria-label={showConfirmerMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showConfirmerMotDePasse ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmerMotDePasse && <p className="error-message">{errors.confirmerMotDePasse}</p>}
          </div>
        </div>

        {/* Section — Informations de la ferme (agriculteurs uniquement) */}
        {type === 'agriculteur' && (
          <div className="form-section">
            <h3 className="form-section__title">Votre ferme</h3>

            <div className="form-group">
              <label htmlFor="fermeNom">Nom de la ferme *</label>
              <input
                id="fermeNom"
                type="text"
                name="fermeNom"
                placeholder="Ex : Ferme de la Savane Verte"
                value={formData.fermeNom}
                onChange={handleChange}
                className={errors.fermeNom ? 'error' : ''}
              />
              {errors.fermeNom && <p className="error-message">{errors.fermeNom}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="localisation">Localisation *</label>
              <input
                id="localisation"
                type="text"
                name="localisation"
                placeholder="Ex : Bouaké, Côte d'Ivoire"
                value={formData.localisation}
                onChange={handleChange}
                className={errors.localisation ? 'error' : ''}
              />
              {errors.localisation && <p className="error-message">{errors.localisation}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="typeExploitation">Type d'exploitation *</label>
              <select
                id="typeExploitation"
                name="typeExploitation"
                value={formData.typeExploitation}
                onChange={handleChange}
                className={errors.typeExploitation ? 'error' : ''}
              >
                {TYPE_EXPLOITATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.typeExploitation && <p className="error-message">{errors.typeExploitation}</p>}
            </div>

            {/* GOLD / PLATINUM — champs supplémentaires */}
            {showSurface && (
              <div className="form-group">
                <label htmlFor="surface">
                  Surface exploitée
                  <span className="form-label-optional"> (facultatif)</span>
                </label>
                <input
                  id="surface"
                  type="text"
                  name="surface"
                  placeholder="Ex : 5 hectares, 2 ha, 500 m²"
                  value={formData.surface}
                  onChange={handleChange}
                />
              </div>
            )}

            {showDescription && (
              <div className="form-group">
                <label htmlFor="description">
                  Description de votre ferme
                  <span className="form-label-optional"> (facultatif)</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Décrivez votre ferme, vos méthodes de production, vos denrées phares..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                />
                <p className="form-field-hint">
                  Une bonne description améliore votre visibilité auprès des acheteurs.
                </p>
              </div>
            )}

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="accepteAccord"
                name="accepteAccord"
                checked={formData.accepteAccord}
                onChange={handleChange}
              />
              <label htmlFor="accepteAccord">
                J'accepte les <Link to="/condition">conditions d'utilisation</Link>
              </label>
            </div>
            {errors.accepteAccord && <p className="error-message">{errors.accepteAccord}</p>}
          </div>
        )}

        {submitError && (
          <div className="submit-error-banner">{submitError}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={'submit-btn' + (isPromo ? ' submit-btn--promo' : '')}
        >
          {isSubmitting
            ? 'Traitement en cours...'
            : isPromo
              ? "S'inscrire gratuitement"
              : type === 'consommateur'
                ? 'Créer mon compte'
                : "Valider l'inscription"}
        </button>

        {!formule && type && (
          <p className="form-footer-hint">
            Pas de formule sélectionnée ?{' '}
            <Link to="/offres">Voir les offres disponibles</Link>
          </p>
        )}
      </form>
    </div>
  );
};

export default InscriptionPage;
