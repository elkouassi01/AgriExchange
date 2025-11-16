import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './InscriptionPage.css';

// 🌍 Indicatifs avec drapeaux
const indicatifs = [
  { code: '+225', pays: 'Côte d’Ivoire', drapeau: '🇨🇮' },
  { code: '+33', pays: 'France', drapeau: '🇫🇷' },
  { code: '+241', pays: 'Gabon', drapeau: '🇬🇦' },
  { code: '+242', pays: 'Congo', drapeau: '🇨🇬' },
  { code: '+243', pays: 'RDC', drapeau: '🇨🇩' },
  { code: '+221', pays: 'Sénégal', drapeau: '🇸🇳' },
  { code: '+223', pays: 'Mali', drapeau: '🇲🇱' },
  { code: '+224', pays: 'Guinée', drapeau: '🇬🇳' },
  { code: '+229', pays: 'Bénin', drapeau: '🇧🇯' },
  { code: '+228', pays: 'Togo', drapeau: '🇹🇬' },
];

// 💰 Tarifs
const formulesTarifs = {
  consommateur: { BLEU: 1000, GOLD: 3000, PLATINUM: 5000 },
  agriculteur: { BLEU: 500, GOLD: 1500, PLATINUM: 3000 },
};

// 🎁 Promo
const promoFin = new Date('2026-04-01');
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InscriptionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || '';
  const formule = queryParams.get('formule') || '';

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    confirmerMotDePasse: '',
    localisation: '',
    typeExploitation: '',
    fermeNom: '',
    contact: '',
    accepteAccord: false,
  });

  const [indicatif, setIndicatif] = useState('+225');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) newErrors.nom = 'Nom requis';
    else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.nom))
      newErrors.nom = 'Nom invalide';

    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Email invalide';

    if (!formData.contact.trim()) newErrors.contact = 'Numéro requis';
    else if (/[^0-9]+/.test(formData.contact)) newErrors.contact = 'Chiffres uniquement';
    else if (formData.contact.length < 8) newErrors.contact = 'Numéro trop court';

    if (formData.motDePasse.length < 6)
      newErrors.motDePasse = 'Min 6 caractères';
    if (formData.motDePasse !== formData.confirmerMotDePasse)
      newErrors.confirmerMotDePasse = 'Mots de passe différents';

    if (type === 'agriculteur') {
      if (!formData.fermeNom.trim()) newErrors.fermeNom = 'Nom de ferme requis';
      if (!formData.localisation.trim()) newErrors.localisation = 'Localisation requise';
      if (!formData.typeExploitation.trim()) newErrors.typeExploitation = 'Type requis';
      if (!formData.accepteAccord) newErrors.accepteAccord = 'Conditions requises';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const maintenant = new Date();
    const fullPhone = indicatif + formData.contact;

    try {
      if (type === 'agriculteur' && maintenant < promoFin) {
        const res = await fetch(`${API_URL}/api/inscription-gratuite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            type,
            formule,
            gratuit: true,
            promoExpireLe: promoFin,
            contact: fullPhone,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('pendingPhone', fullPhone);
          navigate('/verify-otp', { state: { telephone: fullPhone } });
        } else {
          alert(data.message || 'Erreur');
        }
        return;
      }

      const montant = formulesTarifs[type][formule];
      const transaction_id = `CP${Date.now()}`;
      const contactClean = fullPhone.replace(/\D/g, '');

      const paymentData = {
        apikey: '8937149296838988c80faf0.18612017',
        site_id: '105896693',
        transaction_id,
        amount: montant,
        currency: 'XOF',
        description: `Abonnement ${formule} (${type})`,
        customer_name: formData.nom.substring(0, 50),
        customer_email: formData.email,
        customer_phone_number: contactClean,
        notify_url: `${API_URL}/api/cinetpay-notify`,
        return_url: `${window.location.origin}/paiement-reussi`,
        cancel_url: `${window.location.origin}/paiement-echec`,
        channels: 'ALL',
        metadata: JSON.stringify({
          user_email: formData.email,
          user_type: type,
          subscription_plan: formule,
        }),
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
        alert(result.message || 'Erreur paiement');
      }
    } catch (error) {
      alert(`Erreur : ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFormuleDetails = () => {
    const formules = {
      BLEU: { price: type === 'agriculteur' ? '500 FCFA/mois' : '1 000 FCFA/mois' },
      GOLD: { price: type === 'agriculteur' ? '1 500 FCFA/3 mois' : '3 000 FCFA/mois' },
      PLATINUM: { price: type === 'agriculteur' ? '3 000 FCFA/6 mois' : '5 000 FCFA/mois' },
    };
    return formules[formule] || {};
  };

  return (
    <div className="inscription-container">
      <div className="inscription-header">
        <h1>Inscription {type === 'agriculteur' ? 'Agriculteur' : 'Consommateur'}</h1>
        {formule && (
          <div className="formule-badge">
            Formule {formule} • {getFormuleDetails().price}
          </div>
        )}
        {type === 'agriculteur' && new Date() < promoFin && (
          <div className="promo-banner">
            🎉 Inscription gratuite jusqu’au {promoFin.toLocaleDateString()}
          </div>
        )}
      </div>

      <form className="inscription-form" onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          name="nom"
          placeholder="Nom complet"
          value={formData.nom}
          onChange={handleChange}
        />
        {errors.nom && <p className="error">{errors.nom}</p>}

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <p className="error">{errors.email}</p>}

        <div className="contact-row">
          <select
            value={indicatif}
            onChange={(e) => setIndicatif(e.target.value)}
            className="indicatif-select"
          >
            {indicatifs.map((item) => (
              <option key={item.code} value={item.code}>
                {item.drapeau} {item.code}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="contact"
            placeholder="Numéro de téléphone"
            value={formData.contact}
            onChange={handleChange}
          />
        </div>
        {errors.contact && <p className="error">{errors.contact}</p>}

        <input
          type="password"
          name="motDePasse"
          placeholder="Mot de passe"
          value={formData.motDePasse}
          onChange={handleChange}
        />
        {errors.motDePasse && <p className="error">{errors.motDePasse}</p>}

        <input
          type="password"
          name="confirmerMotDePasse"
          placeholder="Confirmer le mot de passe"
          value={formData.confirmerMotDePasse}
          onChange={handleChange}
        />
        {errors.confirmerMotDePasse && <p className="error">{errors.confirmerMotDePasse}</p>}

        {type === 'agriculteur' && (
          <>
            <input
              type="text"
              name="fermeNom"
              placeholder="Nom de la ferme"
              value={formData.fermeNom}
              onChange={handleChange}
            />
            {errors.fermeNom && <p className="error">{errors.fermeNom}</p>}

            <input
              type="text"
              name="localisation"
              placeholder="Localisation"
              value={formData.localisation}
              onChange={handleChange}
            />
            {errors.localisation && <p className="error">{errors.localisation}</p>}

            <input
              type="text"
              name="typeExploitation"
              placeholder="Type d’exploitation"
              value={formData.typeExploitation}
              onChange={handleChange}
            />
            {errors.typeExploitation && <p className="error">{errors.typeExploitation}</p>}

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="accepteAccord"
                checked={formData.accepteAccord}
                onChange={handleChange}
              />
              <Link to="/condition">J’accepte les conditions d’utilisation</Link>
            </label>
            {errors.accepteAccord && <p className="error">{errors.accepteAccord}</p>}
          </>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Traitement...' : 'Valider mon inscription'}
        </button>
      </form>
    </div>
  );
};

export default InscriptionPage;