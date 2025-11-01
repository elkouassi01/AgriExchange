import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./AddProductForm.css";

const AddProductForm = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nom: "",
    categorie: "céréales",
    stock: "",
    unite: "kg",
    description: "",
    prix: "",
    dateRecolte: "",
    etat: "frais",
    mensurations: "",
    tags: "",
    certifications: "",
    imageUrl: ""
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // ---------- REDIRECTIONS ----------
  useEffect(() => {
    if (!userLoading) {
      if (!user) navigate("/login");
      else if (user.role !== "agriculteur" && user.role !== "farmer")
        setError("Accès réservé aux agriculteurs.");
    }
  }, [user, userLoading, navigate]);

  // ---------- HANDLERS CLASSIQUES ----------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name])
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleTagsChange = (e) => {
    const arr = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, tags: arr }));
  };

  const handleCertificationsChange = (e) => {
    const arr = e.target.value.split(",").map((c) => c.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, certifications: arr }));
  };

  // ---------- GESTION IMAGE ----------
  const processImageFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type))
      return setError("Format non supporté (JPEG, PNG, WEBP uniquement).");
    if (file.size > 5 * 1024 * 1024)
      return setError("Image > 5 Mo.");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imageUrl: ""
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processImageFile(file);
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const removeImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imageFile: null, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0]);
  };

  // ---------- UTILITAIRE ----------
  const getAuthToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const buildFormData = (data, file) => {
    const fd = new FormData();
    Object.keys(data).forEach((k) => {
      if (k === "imageFile") return;
      if (Array.isArray(data[k])) fd.append(k, JSON.stringify(data[k]));
      else fd.append(k, data[k]);
    });
    if (file) fd.append("imageFile", file);
    return fd;
  };

  // ---------- SOUMISSION ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setValidationErrors({});

    // validations rapides
    if (!formData.nom || !formData.prix || !formData.stock || !formData.dateRecolte) {
      setError("Veuillez remplir tous les champs obligatoires.");
      setLoading(false);
      return;
    }
    if (parseFloat(formData.prix) <= 0) {
      setError("Le prix doit être supérieur à 0.");
      setLoading(false);
      return;
    }
    if (parseInt(formData.stock) < 0) {
      setError("Le stock ne peut pas être négatif.");
      setLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Vous devez être connecté pour ajouter un produit.");
      setLoading(false);
      return;
    }

    try {
      // Préparation des données
      const productData = {
        nom: formData.nom,
        prix: parseFloat(formData.prix),
        description: formData.description || "",
        categorie: formData.categorie,
        stock: parseInt(formData.stock),
        unite: formData.unite,
        dateRecolte: formData.dateRecolte,
        etat: formData.etat,
        mensurations: formData.mensurations || "",
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        certifications: Array.isArray(formData.certifications)
          ? formData.certifications
          : [],
        imageUrl: formData.imageUrl || ""
      };

      const payload = buildFormData(productData, formData.imageFile);
      
      console.log('TOKEN ENVOYÉ :', token);
      console.log('HEADERS :', { Authorization: `Bearer ${token}` });

      const res = await axios.post(
        "http://localhost:5000/api/v1/products/add",
        payload,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` } // ❌ PAS Content-Type
        }
      );

      console.log("✅ Réponse de l'API:", res.data);

      if (res.data.success) {
        setSuccess(true);
        setFormData({
          nom: "",
          categorie: "céréales",
          stock: "",
          unite: "kg",
          description: "",
          prix: "",
          dateRecolte: "",
          etat: "frais",
          mensurations: "",
          tags: "",
          certifications: "",
          imageUrl: ""
        });
        setImagePreview(null);
        setTimeout(() => navigate("/mes-produits"), 2000);
      }
    } catch (err) {
      console.error("❌ Erreur API:", err.response?.data || err.message);
      if (err.response?.data?.errors) {
        const errs = {};
        err.response.data.errors.forEach((e) => (errs[e.field] = e.message));
        setValidationErrors(errs);
        setError("Veuillez corriger les erreurs dans le formulaire.");
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Erreur lors de l'ajout du produit. Veuillez réessayer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------- RENDU ----------
  if (userLoading)
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <span style={{ marginLeft: "1rem", color: "var(--primary-glow)" }}>
          Chargement...
        </span>
      </div>
    );

  if (user && user.role !== "agriculteur" && user.role !== "farmer")
    return (
      <div className="error-container">
        <h2>Accès non autorisé</h2>
        <p>Cette fonctionnalité est réservée aux agriculteurs.</p>
        <button className="btn" onClick={() => navigate("/")}>
          Retour à l'accueil
        </button>
      </div>
    );

  return (
    <div className="add-product-form">
      <div className="form-header">
        <h2>🌱 Ajouter un nouveau produit</h2>
        <p className="form-subtitle">
          Remplissez les informations de votre produit agricole
        </p>
      </div>

      {error && (
        <div className="alert error">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          <strong>Succès :</strong> ✅ Produit ajouté avec succès ! Redirection
          en cours...
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-form">
        {/* --- Informations principales --- */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">Informations principales</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nom" className="label-required">
                Nom du produit
              </label>
              <input
                id="nom"
                name="nom"
                type="text"
                className="form-control"
                value={formData.nom}
                onChange={handleChange}
                required
                placeholder="Ex: Tomates Bio, Pommes Golden..."
              />
              {validationErrors.nom && (
                <span className="field-error">⚠️ {validationErrors.nom}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="categorie" className="label-required">
                Catégorie
              </label>
              <select
                id="categorie"
                name="categorie"
                className="form-control"
                value={formData.categorie}
                onChange={handleChange}
                required
              >
                <option value="fruits">Fruits</option>
                <option value="légumes">Légumes</option>
                <option value="viandes">Viandes</option>
                <option value="produits laitiers">Produits laitiers</option>
                <option value="céréales">Céréales</option>
                <option value="épices">Épices</option>
                <option value="autres">Autres</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="etat" className="label-required">
                État du produit
              </label>
              <select
                id="etat"
                name="etat"
                className="form-control"
                value={formData.etat}
                onChange={handleChange}
                required
              >
                <option value="frais">Frais</option>
                <option value="sec">Sec</option>
                <option value="congelé">Congelé</option>
                <option value="transformé">Transformé</option>
                <option value="séché">Séché</option>
                <option value="fermenté">Fermenté</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description du produit</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="Décrivez votre produit (qualité, variété, méthode de production, particularités...)"
              rows="4"
            />
          </div>
        </div>

        {/* --- Stock & Prix --- */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">💰</span>
            <h3 className="section-title">Stock et Prix</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="stock" className="label-required">
                Quantité en stock
              </label>
              <input
                id="stock"
                name="stock"
                type="number"
                className="form-control"
                min="0"
                value={formData.stock}
                onChange={handleChange}
                required
                placeholder="0"
              />
              {validationErrors.stock && (
                <span className="field-error">⚠️ {validationErrors.stock}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="unite" className="label-required">
                Unité de vente
              </label>
              <select
                id="unite"
                name="unite"
                className="form-control"
                value={formData.unite}
                onChange={handleChange}
                required
              >
                <option value="kg">Kilogramme (kg)</option>
                <option value="litre">Litre</option>
                <option value="pièce">Pièce</option>
                <option value="sachet">Sachet</option>
                <option value="boîte">Boîte</option>
                <option value="botte">Botte</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prix" className="label-required">
                Prix (FCFA)
              </label>
              <input
                id="prix"
                name="prix"
                type="number"
                className="form-control"
                step="0.01"
                min="0.01"
                value={formData.prix}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
              {validationErrors.prix && (
                <span className="field-error">⚠️ {validationErrors.prix}</span>
              )}
            </div>
          </div>
        </div>

        {/* --- Caractéristiques --- */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">📊</span>
            <h3 className="section-title">Caractéristiques</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="dateRecolte" className="label-required">
                Date de récolte
              </label>
              <input
                id="dateRecolte"
                name="dateRecolte"
                type="date"
                className="form-control"
                value={formData.dateRecolte}
                onChange={handleChange}
                required
                max={new Date().toISOString().split("T")[0]}
              />
              {validationErrors.dateRecolte && (
                <span className="field-error">⚠️ {validationErrors.dateRecolte}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="mensurations">Mensurations / Calibre</label>
              <input
                id="mensurations"
                name="mensurations"
                type="text"
                className="form-control"
                value={formData.mensurations}
                onChange={handleChange}
                placeholder="Ex: Calibre 60-80mm, Poids moyen 150g..."
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                name="tags"
                type="text"
                className="form-control"
                value={Array.isArray(formData.tags) ? formData.tags.join(", ") : formData.tags}
                onChange={handleTagsChange}
                placeholder="bio, local, de saison, sans pesticides..."
              />
              <small>Séparez les tags par des virgules</small>
            </div>

            <div className="form-group">
              <label htmlFor="certifications">Certifications</label>
              <input
                id="certifications"
                name="certifications"
                type="text"
                className="form-control"
                value={Array.isArray(formData.certifications)
                  ? formData.certifications.join(", ")
                  : formData.certifications}
                onChange={handleCertificationsChange}
                placeholder="bio, AOP, label rouge, commerce équitable..."
              />
              <small>Séparez les certifications par des virgules</small>
            </div>
          </div>
        </div>

        {/* --- Image --- */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">🖼️</span>
            <h3 className="section-title">Image du produit</h3>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">URL de l'image (optionnel)</label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              className="form-control"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
            <small>Ou téléchargez une image ci-dessous</small>
          </div>

          <div
            className={`image-upload-area ${isDragging ? "dragging" : ""}`}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ cursor: "pointer" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg, image/jpg, image/png, image/webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Aperçu" className="image-preview" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  style={{
                    marginTop: "1rem",
                    padding: "0.5rem 1rem",
                    background: "rgba(255, 77, 77, 0.2)",
                    color: "#ff6b6b",
                    border: "1px solid rgba(255, 77, 77, 0.4)",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  ❌ Supprimer l'image
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <div className="upload-text">
                  {isDragging
                    ? "Déposez l'image ici"
                    : "Cliquez pour parcourir ou glissez-déposez une image"}
                </div>
                <div className="upload-hint">
                  Formats supportés: JPEG, PNG, WEBP (max. 5MB)
                </div>
              </>
            )}
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className={`btn ${loading ? "loading" : ""}`}>
            {loading ? (
              <>
                <span
                  className="loading-spinner"
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid transparent",
                    borderTop: "2px solid currentColor",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    display: "inline-block",
                    marginRight: "8px"
                  }}
                ></span>
                Ajout en cours...
              </>
            ) : (
              '✅ Ajouter le produit'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/mes-produits")}
            className="btn btn-secondary"
          >
            ↩️ Retour à mes produits
          </button>
        </div>

        <p className="form-help">* Les champs marqués d'une astérisque sont obligatoires</p>
      </form>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span
            style={{
              marginLeft: "1rem",
              color: "var(--primary-glow)",
              fontSize: "1.1rem",
              fontWeight: "600"
            }}
          >
            Traitement en cours...
          </span>
        </div>
      )}
    </div>
  );
};

export default AddProductForm;