import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import './InscriptionPage.css';


const formulesTarifs = {
  consommateur: { BLEU: 1000, GOLD: 3000, PLATINUM: 5000 },
  agriculteur: { BLEU: 500, GOLD: 1500, PLATINUM: 3000 },
};

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
    ferme: '',
    contact: '',
    accepteAccord: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gestion des inputs
  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Nom requis';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.nom)) {
      newErrors.nom = 'Le nom ne doit contenir que des lettres, espaces, tirets ou apostrophes';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact requis';
    }

    if (formData.motDePasse.length < 6) {
      newErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (formData.motDePasse !== formData.confirmerMotDePasse) {
      newErrors.confirmerMotDePasse = 'Les mots de passe ne correspondent pas';
    }

    if (type === 'agriculteur') {
      if (!formData.ferme.trim()) {
        newErrors.ferme = 'Nom de ferme requis';
      }
      if (!formData.localisation.trim()) {
        newErrors.localisation = 'Localisation requise';
      }
      if (!formData.typeExploitation.trim()) {
        newErrors.typeExploitation = 'Type d\'exploitation requis';
      }
      if (!formData.accepteAccord) {
        newErrors.accepteAccord = 'Vous devez accepter l\'accord';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!formulesTarifs[type] || !formulesTarifs[type][formule]) {
      alert(`Formule ${formule} non disponible pour le type ${type}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparation du montant et transaction id
      const montant = formulesTarifs[type][formule];
      const transaction_id = `CP${Date.now()}`;

      // Nettoyage du contact (seulement chiffres)
      const contactClean = formData.contact.replace(/\D/g, '');

      // Données de paiement pour CinetPay
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
        notify_url: 'https://votre-backend.com/api/cinetpay-notify',
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

      // Envoi vers l’API CinetPay
      const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.code === '201' && result.data?.payment_url) {
        window.location.href = result.data.payment_url;
      } else {
        console.error('Réponse API inattendue:', result);
        alert(result.message || result.description || 'Erreur lors de la création du paiement');
      }
    } catch (error) {
      console.error('Erreur de paiement:', error);
      alert(`Erreur lors du paiement : ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Récupère les détails tarifaires pour l’affichage
  const getFormuleDetails = () => {
    const formules = {
      BLEU: { price: type === 'agriculteur' ? '500 FCFA/mois' : '1 000 FCFA/mois' },
      GOLD: { price: type === 'agriculteur' ? '1 500 FCFA/3mois' : '3 000 FCFA/mois' },
      PLATINUM: { price: type === 'agriculteur' ? '3 000 FCFA/6mois' : '5 000 FCFA/mois' },
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
      </div>

      <form className="inscription-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="nom">Nom complet</label>
          <input
            id="nom"
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            className={errors.nom ? 'error' : ''}
            autoComplete="name"
          />
          {errors.nom && <span className="error-message">{errors.nom}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Adresse email</label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            autoComplete="email"
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="contact">Contact (téléphone/WhatsApp)</label>
          <input
            id="contact"
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            className={errors.contact ? 'error' : ''}
            autoComplete="tel"
          />
          {errors.contact && <span className="error-message">{errors.contact}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="motDePasse">Mot de passe</label>
          <input
            id="motDePasse"
            type="password"
            name="motDePasse"
            value={formData.motDePasse}
            onChange={handleChange}
            className={errors.motDePasse ? 'error' : ''}
            autoComplete="new-password"
          />
          {errors.motDePasse && <span className="error-message">{errors.motDePasse}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmerMotDePasse">Confirmer le mot de passe</label>
          <input
            id="confirmerMotDePasse"
            type="password"
            name="confirmerMotDePasse"
            value={formData.confirmerMotDePasse}
            onChange={handleChange}
            className={errors.confirmerMotDePasse ? 'error' : ''}
            autoComplete="new-password"
          />
          {errors.confirmerMotDePasse && (
            <span className="error-message">{errors.confirmerMotDePasse}</span>
          )}
        </div>

        {type === 'agriculteur' && (
          <>
            <div className="form-group">
              <label htmlFor="ferme">Nom de la ferme</label>
              <input
                id="ferme"
                type="text"
                name="ferme"
                value={formData.ferme}
                onChange={handleChange}
                className={errors.ferme ? 'error' : ''}
              />
              {errors.ferme && <span className="error-message">{errors.ferme}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="typeExploitation">Type d'exploitation</label>
              <input
                id="typeExploitation"
                type="text"
                name="typeExploitation"
                value={formData.typeExploitation}
                onChange={handleChange}
                placeholder="ex: maraîchage, élevage..."
                className={errors.typeExploitation ? 'error' : ''}
              />
              {errors.typeExploitation && (
                <span className="error-message">{errors.typeExploitation}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="localisation">Localisation</label>
              <input
                id="localisation"
                type="text"
                name="localisation"
                value={formData.localisation}
                onChange={handleChange}
                className={errors.localisation ? 'error' : ''}
              />
              {errors.localisation && <span className="error-message">{errors.localisation}</span>}
            </div>

            <div className={`form-group checkbox-group ${errors.accepteAccord ? 'error' : ''}`}>
              <input
                id="accepteAccord"
                type="checkbox"
                name="accepteAccord"
                checked={formData.accepteAccord}
                onChange={handleChange}
              />
              <label htmlFor="accepteAccord"><Link to="/condition">J'accepte la fiche d'accord de principe </Link></label>
              {errors.accepteAccord && (
                <span className="error-message">{errors.accepteAccord}</span>
              )}
            </div>
          </>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : 'Créer mon compte'}
        </button>
      </form>      
    </div>
    
  );
};

export default InscriptionPage;
