import React, { useState } from 'react';
import { Upload, X, PlusCircle, Info, Package, DollarSign, AlignLeft, Layers, Scale } from 'lucide-react';
import './AddProductForm.css';

const AddProductForm = ({ onProductAdded }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prix: '',
    description: '',
    imageUrl: '',
    categorie: '',
    stock: '',
    unite: 'kg',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);

  const categories = [
    'Fruits', 'Légumes', 'Viandes', 'Produits laitiers', 'Céréales', 'Autres'
  ];

  const units = [
    { value: 'kg', label: 'Kilogramme' },
    { value: 'g', label: 'Gramme' },
    { value: 'L', label: 'Litre' },
    { value: 'pièce', label: 'Pièce' },
    { value: 'botan', label: 'Botan' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 2 * 1024 * 1024) {
      setError('La taille de l\'image ne doit pas dépasser 2MB');
      return;
    }
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          imageUrl: event.target.result
        }));
        setImageFile(file);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'imageUrl' && formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erreur lors de la création du produit');
      }

      const newProduct = await response.json();
      onProductAdded?.(newProduct);

      // Reset form
      setFormData({
        nom: '',
        prix: '',
        description: '',
        imageUrl: '',
        categorie: '',
        stock: '',
        unite: 'kg'
      });
      setImageFile(null);
      setSuccessMessage('Produit ajouté avec succès !');

    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="product-form-container">
      <div className="form-header">
        <h2>Ajouter un nouveau produit</h2>
      </div>

      {error && (
        <div className="error-message">
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-group">
          <label htmlFor="nom">
            
            <span>Nom du produit*</span>
          </label>
          <input
            id="nom"
            name="nom"
            type="text"
            placeholder="Ex: Pommes Golden"
            value={formData.nom}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prix">
              <span>Prix (FCFA)*</span>
            </label>
            <input
              id="prix"
              name="prix"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.prix}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">
              <span>Stock*</span>
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              placeholder="Quantité"
              value={formData.stock}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="unite">
              <span>Unité*</span>
            </label>
            <select
              id="unite"
              name="unite"
              value={formData.unite}
              onChange={handleChange}
              required
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="categorie">Catégorie*</label>
          <select
            id="categorie"
            name="categorie"
            value={formData.categorie}
            onChange={handleChange}
            required
          >
            <option value="">Sélectionnez une catégorie</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            
            <span>Description</span>
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Décrivez votre produit..."
            value={formData.description}
            onChange={handleChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Image du produit</label>
          <div className="image-upload-container">
            {!formData.imageUrl ? (
              <>
                <label htmlFor="image-upload" className="upload-button">
                  <Upload size={18} />
                  <span>Parcourir...</span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                  />
                </label>
                <p className="upload-hint">Formats supportés: JPG, PNG, WEBP (max 2MB)</p>
              </>
            ) : (
              <div className="image-preview-container">
                <img 
                  src={formData.imageUrl} 
                  alt="Aperçu du produit" 
                  className="image-preview"
                />
                <button 
                  type="button" 
                  onClick={removeImage}
                  className="remove-image-button"
                  aria-label="Supprimer l'image"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="spinner"></span>
          ) : (
            'Ajouter le produit'
          )}
        </button>
      </form>
    </div>
  );
};

export default AddProductForm;