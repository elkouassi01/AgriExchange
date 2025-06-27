import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Info, Tag, Calendar, Check } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import './AddProductForm.css';

const AddProductForm = ({ onProductAdded }) => {
  const { api } = useUser();

  const countryCodes = [
    { code: '+225', name: 'Côte d\'Ivoire' },
    { code: '+33', name: 'France' },
    { code: '+229', name: 'Bénin' },
    { code: '+226', name: 'Burkina Faso' },
    { code: '+223', name: 'Mali' },
    { code: '+224', name: 'Guinée' },
    { code: '+221', name: 'Sénégal' },
    { code: '+228', name: 'Togo' },
    { code: '+234', name: 'Nigeria' },
    { code: '+237', name: 'Cameroun' },
    { code: '+1', name: 'États-Unis/Canada' },
  ];

  const initialFormData = {
    nom: '',
    prix: '',
    description: '',
    categorie: '',
    stock: '',
    unite: 'kg',
    countryCode: '+225',
    phoneNumber: '',
    dateRecolte: '',
    mensurations: '',
    etat: 'frais',
    tags: '',
    certifications: []
  };

  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const fileInputRef = useRef(null);

  const categories = ['Fruits', 'Légumes', 'Céréales', 'Viandes', 'Produits laitiers', 'Épices', 'Autres'];
  const etats = ['frais', 'sec', 'congelé', 'transformé', 'séché', 'fermenté', 'autre'];
  const availableCerts = ['bio', 'AOP', 'IGP', 'label rouge', 'commerce équitable', 'sans OGM'];
  const units = [
    { value: 'kg', label: 'Kilogramme' },
    { value: 'g', label: 'Gramme' },
    { value: 'L', label: 'Litre' },
    { value: 'ml', label: 'Millilitre' },
    { value: 'pièce', label: 'Pièce' },
    { value: 'botan', label: 'Botan' },
    { value: 'sachet', label: 'Sachet' },
  ];

  const validateName = (name) => {
    const nameRegex = /^[\p{L}\s'-]+$/u;
    if (!name.trim()) return 'Le nom du produit est obligatoire';
    if (!nameRegex.test(name)) return 'Le nom ne doit contenir que des lettres et espaces';
    if (name.length < 3) return 'Le nom doit contenir au moins 3 caractères';
    if (name.length > 100) return 'Le nom ne peut dépasser 100 caractères';
    return null;
  };

  const validatePrice = (price) => {
    if (!price) return 'Le prix est obligatoire';
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) return 'Le prix doit être un nombre';
    if (priceNum <= 0) return 'Le prix doit être supérieur à zéro';
    if (priceNum > 1000000) return 'Le prix est trop élevé';
    return null;
  };

  const validatePhoneNumber = (number) => {
    const phoneRegex = /^[0-9\s-]{8,15}$/;
    if (!number.trim()) return 'Le numéro de contact est obligatoire';
    if (!phoneRegex.test(number)) return 'Format de numéro invalide (ex: 07 00 00 00 00)';
    return null;
  };

  const validateDate = (date) => {
    if (!date) return 'La date de récolte est obligatoire';
    const selectedDate = new Date(date);
    const today = new Date();
    if (selectedDate > today) return 'La date ne peut être dans le futur';
    return null;
  };

  const validateStock = (stock) => {
    if (stock === '') return null;
    const stockNum = parseInt(stock);
    if (isNaN(stockNum)) return 'Le stock doit être un nombre entier';
    if (stockNum < 0) return 'Le stock ne peut être négatif';
    if (stockNum > 10000) return 'Le stock est trop élevé';
    return null;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("La taille de l'image ne doit pas dépasser 2MB");
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("Format d'image non supporté. Utilisez JPG, PNG ou WEBP");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target.result);
      setImageFile(file);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleCertification = (cert) => {
    setFormData(prev => {
      const newCerts = prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert];
      return { ...prev, certifications: newCerts };
    });
  };

  const validateForm = () => {
    const errors = {};
    errors.nom = validateName(formData.nom);
    errors.prix = validatePrice(formData.prix);
    errors.phoneNumber = validatePhoneNumber(formData.phoneNumber);
    errors.dateRecolte = validateDate(formData.dateRecolte);
    errors.stock = validateStock(formData.stock);

    if (!formData.categorie) errors.categorie = 'Veuillez sélectionner une catégorie';
    if (!formData.unite) errors.unite = 'Veuillez sélectionner une unité';

    setFieldErrors(errors);
    
    return Object.values(errors).every(error => error === null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Nettoyage du numéro de téléphone
      const cleanedPhone = formData.phoneNumber.replace(/[^0-9]/g, '');
      const fullContact = `${formData.countryCode}${cleanedPhone}`;
      
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      // Préparation des données à envoyer
      const dataToSend = {
        nom: formData.nom,
        prix: parseFloat(formData.prix),
        description: formData.description,
        categorie: formData.categorie,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        unite: formData.unite,
        contact: fullContact,
        dateRecolte: formData.dateRecolte,
        mensurations: formData.mensurations,
        etat: formData.etat,
        tags: tagsArray,
        certifications: formData.certifications
      };

      const formDataToSend = new FormData();
      
      // Ajout des champs un par un
      Object.keys(dataToSend).forEach(key => {
        const value = dataToSend[key];
        if (value === '') return;
        
        if (Array.isArray(value)) {
          // Pour les tableaux, on ajoute chaque élément séparément
          value.forEach(item => {
            formDataToSend.append(key, item);
          });
        } else {
          formDataToSend.append(key, value);
        }
      });

      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      // Envoi des données
      const response = await api.post('/products', formDataToSend, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Ajout du token
        },
      });

      const newProduct = response.data;
      onProductAdded?.(newProduct);

      // Réinitialisation du formulaire
      setFormData(initialFormData);
      setImageFile(null);
      setPreviewUrl('');
      setFieldErrors({});
      setSuccessMessage('Produit ajouté avec succès !');
      setShowSuccessAnimation(true);

      setTimeout(() => setShowSuccessAnimation(false), 3000);

    } catch (error) {
      let errorMessage = 'Erreur lors de la création du produit';
      
      console.error("Erreur complète:", error);
      
      if (error.response) {
        console.error("Réponse d'erreur:", error.response.data);
        
        if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 413) {
          errorMessage = "Fichier trop volumineux (max 2MB)";
        } else if (error.response.status === 400) {
          if (Array.isArray(error.response.data.errors)) {
            errorMessage = "Erreurs de validation : " + error.response.data.errors.join(', ');
          } else if (typeof error.response.data.errors === 'object') {
            const errorList = Object.values(error.response.data.errors).flat();
            errorMessage = "Erreurs de validation : " + errorList.join(', ');
          } else {
            errorMessage = "Erreur de validation : " + JSON.stringify(error.response.data.errors);
          }
        } else if (error.response.status === 401) {
          errorMessage = "Vous devez être connecté pour ajouter un produit";
        } else if (error.response.status === 403) {
          errorMessage = "Vous n'avez pas les droits pour effectuer cette action";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  return (
    <div className="product-form-container">
      <h2 className="form-title">
        <Tag size={24} className="icon" /> Ajouter un nouveau produit
      </h2>

      {showSuccessAnimation && (
        <div className="success-animation">
          <div className="checkmark">✓</div>
          <p>Produit ajouté avec succès!</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <Info size={18} /> {error}
        </div>
      )}

      {successMessage && !showSuccessAnimation && (
        <div className="success-message">
          <Check size={18} /> {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        <fieldset className="form-section">
          <legend>Informations de base</legend>

          <div className="form-group">
            <label htmlFor="nom">
              Nom du produit <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              placeholder="Ex: Bananes plantain"
              maxLength={100}
              className={fieldErrors.nom ? 'error-input' : ''}
              disabled={isSubmitting}
            />
            {fieldErrors.nom && <span className="error-text">{fieldErrors.nom}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prix">
                Prix (FCFA) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="prix"
                name="prix"
                value={formData.prix}
                onChange={handleChange}
                placeholder="Ex: 1500"
                min="1"
                step="50"
                className={fieldErrors.prix ? 'error-input' : ''}
                disabled={isSubmitting}
              />
              {fieldErrors.prix && <span className="error-text">{fieldErrors.prix}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="unite">
                Unité <span className="required">*</span>
              </label>
              <select
                id="unite"
                name="unite"
                value={formData.unite}
                onChange={handleChange}
                className={fieldErrors.unite ? 'error-input' : ''}
                disabled={isSubmitting}
              >
                <option value="">Sélectionnez une unité</option>
                {units.map(unit => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
              {fieldErrors.unite && <span className="error-text">{fieldErrors.unite}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décrivez votre produit en détails..."
              maxLength={500}
              disabled={isSubmitting}
              rows={4}
            />
            <div className="char-count">{formData.description.length}/500</div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Classification</legend>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="categorie">
                Catégorie <span className="required">*</span>
              </label>
              <select
                id="categorie"
                name="categorie"
                value={formData.categorie}
                onChange={handleChange}
                className={fieldErrors.categorie ? 'error-input' : ''}
                disabled={isSubmitting}
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(category => (
                  <option key={category} value={category.toLowerCase()}>
                    {category}
                  </option>
                ))}
              </select>
              {fieldErrors.categorie && <span className="error-text">{fieldErrors.categorie}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="etat">État du produit</label>
              <select
                id="etat"
                name="etat"
                value={formData.etat}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {etats.map(etat => (
                  <option key={etat} value={etat}>
                    {etat.charAt(0).toUpperCase() + etat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Certifications</label>
            <div className="certifications-container">
              {availableCerts.map(cert => (
                <button
                  key={cert}
                  type="button"
                  className={`cert-tag ${formData.certifications.includes(cert) ? 'selected' : ''}`}
                  onClick={() => toggleCertification(cert)}
                  disabled={isSubmitting}
                >
                  {cert}
                  {formData.certifications.includes(cert) && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Mots-clés</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="Ex: bio, local, premium"
              disabled={isSubmitting}
            />
            <small>Séparez les mots-clés par des virgules</small>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Stock et disponibilité</legend>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="stock">Quantité disponible</label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                placeholder="Ex: 50"
                min="0"
                className={fieldErrors.stock ? 'error-input' : ''}
                disabled={isSubmitting}
              />
              {fieldErrors.stock && <span className="error-text">{fieldErrors.stock}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dateRecolte">
                Date de récolte <span className="required">*</span>
              </label>
              <div className="date-input-container">
                <Calendar size={18} className="calendar-icon" />
                <input
                  type="date"
                  id="dateRecolte"
                  name="dateRecolte"
                  value={formData.dateRecolte}
                  onChange={handleChange}
                  max={new Date().toISOString().split('T')[0]}
                  className={fieldErrors.dateRecolte ? 'error-input' : ''}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.dateRecolte && <span className="error-text">{fieldErrors.dateRecolte}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>
              Contact <span className="required">*</span>
            </label>
            
            <div className="form-row" style={{ gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <select
                  id="countryCode"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  className={fieldErrors.phoneNumber ? 'error-input' : ''}
                  disabled={isSubmitting}
                >
                  {countryCodes.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.code} {country.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group" style={{ flex: 3 }}>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Ex: 07 00 00 00 00"
                  className={fieldErrors.phoneNumber ? 'error-input' : ''}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            {fieldErrors.phoneNumber && (
              <span className="error-text">{fieldErrors.phoneNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="mensurations">Mensurations/Spécificités</label>
            <input
              type="text"
              id="mensurations"
              name="mensurations"
              value={formData.mensurations}
              onChange={handleChange}
              placeholder="Ex: calibre moyen, poids moyen 200g"
              disabled={isSubmitting}
            />
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Image du produit</legend>

          <div className="image-upload-container">
            {previewUrl ? (
              <div className="image-preview">
                <img src={previewUrl} alt="Prévisualisation produit" />
                <button type="button" className="btn-remove-image" onClick={removeImage}>
                  <X size={18} /> Supprimer
                </button>
              </div>
            ) : (
              <label htmlFor="image" className="image-upload-label" tabIndex="0">
                <Upload size={36} />
                <span>Ajouter une image (JPG, PNG, WEBP, max 2MB)</span>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  disabled={isSubmitting}
                  hidden
                />
              </label>
            )}
          </div>
        </fieldset>

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={isSubmitting ? 'submitting' : ''}
          >
            {isSubmitting ? 'Ajout en cours...' : 'Ajouter le produit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProductForm;