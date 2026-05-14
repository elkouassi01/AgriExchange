import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./AddProductForm.css";
import { buildApiUrl } from "../config/api";

const EditProductForm = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user, loading: userLoading, token: contextToken } = useUser();
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nom: "", categorie: "céréales", stock: "", unite: "kg",
    description: "", prix: "", dateRecolte: "", etat: "frais",
    mensurations: "", tags: "", certifications: "", imageUrl: "",
  });

  const [fetchLoading, setFetchLoading] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  const token = contextToken || localStorage.getItem("token") || sessionStorage.getItem("token");

  // ── Chargement du produit existant ──────────────────────────────────────
  useEffect(() => {
    if (userLoading) return;
    if (!user) { navigate("/connexion"); return; }
    if (user.role !== "agriculteur" && user.role !== "farmer") {
      setError("Accès réservé aux agriculteurs.");
      setFetchLoading(false);
      return;
    }
    if (!id) { navigate("/mes-produits"); return; }

    const fetchProduct = async () => {
      try {
        const res = await axios.get(buildApiUrl(`/products/${id}`), {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` },
        });
        const p = res.data?.data?.product || res.data?.product || res.data;
        if (!p) throw new Error("Denrée introuvable");

        // Format dateRecolte -> jj/mm/aaaa pour l'affichage
        const isoStr = p.dateRecolte
          ? new Date(p.dateRecolte).toISOString().split("T")[0]
          : "";
        const [y, m, d] = isoStr ? isoStr.split("-") : ["", "", ""];
        const dateStr = isoStr ? `${d}/${m}/${y}` : "";

        setFormData({
          nom:            p.nom            || "",
          categorie:      p.categorie      || "céréales",
          stock:          p.stock          ?? "",
          unite:          p.unite          || "kg",
          description:    p.description    || "",
          prix:           p.prix           ?? "",
          dateRecolte:    dateStr,
          etat:           p.etat           || "frais",
          mensurations:   p.mensurations   || "",
          tags:           Array.isArray(p.tags) ? p.tags : (p.tags || ""),
          certifications: Array.isArray(p.certifications) ? p.certifications : (p.certifications || ""),
          imageUrl:       p.imageUrl       || "",
        });

        if (p.imageUrl) {
          setExistingImageUrl(p.imageUrl);
          setImagePreview(p.imageUrl);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Impossible de charger la denrée.");
      } finally {
        setFetchLoading(false);
      }
    };

    fetchProduct();
  }, [id, user, userLoading, token, navigate]);

  // ── Handlers classiques ──────────────────────────────────────────────────
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

  const handleDateInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = raw;
    if (raw.length > 4) formatted = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);
    else if (raw.length > 2) formatted = raw.slice(0, 2) + "/" + raw.slice(2);
    setFormData((prev) => ({ ...prev, dateRecolte: formatted }));
  };

  const displayToIso = (display) => {
    if (!display) return "";
    const parts = display.split("/");
    if (parts.length !== 3 || parts[2].length !== 4) return "";
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  };

  // ── Gestion image principale ─────────────────────────────────────────────
  const processImageFile = (file) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) return setError("Format non supporté (JPEG, PNG, WEBP).");
    if (file.size > 5 * 1024 * 1024) return setError("Image > 5 Mo.");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setExistingImageUrl(null);
      setFormData((prev) => ({ ...prev, imageFile: file, imageUrl: "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => { if (e.target.files[0]) processImageFile(e.target.files[0]); };
  const handleUploadClick = () => fileInputRef.current?.click();
  const removeImage = () => {
    setImagePreview(null);
    setExistingImageUrl(null);
    setFormData((prev) => ({ ...prev, imageFile: null, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0]);
  };

  // ── Galerie ──────────────────────────────────────────────────────────────
  const handleGalleryFiles = (files) => {
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const remaining  = 4 - galleryFiles.length;
    const newFiles = []; const newPreviews = [];
    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) return;
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });
    setGalleryFiles((prev) => [...prev, ...newFiles]);
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };
  const removeGalleryImage = (index) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles((prev)    => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Construction du FormData ─────────────────────────────────────────────
  const buildPayload = () => {
    const fd = new FormData();
    const fields = {
      nom: formData.nom,
      prix: parseFloat(formData.prix),
      description: formData.description || "",
      categorie: formData.categorie,
      stock: parseInt(formData.stock, 10),
      unite: formData.unite,
      dateRecolte: displayToIso(formData.dateRecolte),
      etat: formData.etat,
      mensurations: formData.mensurations || "",
      tags: Array.isArray(formData.tags) ? formData.tags : [],
      certifications: Array.isArray(formData.certifications) ? formData.certifications : [],
      imageUrl: formData.imageUrl || existingImageUrl || "",
    };
    Object.keys(fields).forEach((k) => {
      if (Array.isArray(fields[k])) fd.append(k, JSON.stringify(fields[k]));
      else fd.append(k, fields[k]);
    });
    if (formData.imageFile) fd.append("imageFile", formData.imageFile);
    return fd;
  };

  // ── Soumission ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(false); setValidationErrors({});

    if (!formData.nom || !formData.prix || !formData.stock) {
      setError("Veuillez remplir tous les champs obligatoires.");
      setLoading(false); return;
    }
    if (parseFloat(formData.prix) <= 0) {
      setError("Le prix doit être supérieur à 0.");
      setLoading(false); return;
    }
    if (!token) {
      setError("Vous devez être connecté pour modifier une denrée.");
      setLoading(false); return;
    }

    try {
      const res = await axios.put(
        buildApiUrl(`/products/${id}`),
        buildPayload(),
        { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        const productId = res.data.data?.product?.id || id;
        if (galleryFiles.length > 0) {
          try {
            const galleryFd = new FormData();
            galleryFiles.forEach((f) => galleryFd.append("images", f));
            await axios.post(
              buildApiUrl(`/products/${productId}/images`),
              galleryFd,
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (galleryErr) {
            console.warn("Galerie non uploadée :", galleryErr.message);
          }
        }
        setSuccess(true);
        setTimeout(() => navigate("/mes-produits"), 1800);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        const errs = {};
        err.response.data.errors.forEach((e) => (errs[e.field] = e.message));
        setValidationErrors(errs);
        setError("Veuillez corriger les erreurs dans le formulaire.");
      } else {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Erreur lors de la modification. Veuillez réessayer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Rendus de garde ──────────────────────────────────────────────────────
  if (userLoading || fetchLoading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <span style={{ marginLeft: "1rem", color: "var(--primary-glow)" }}>Chargement...</span>
      </div>
    );
  }

  if (user && user.role !== "agriculteur" && user.role !== "farmer") {
    return (
      <div className="error-container">
        <h2>Accès non autorisé</h2>
        <p>Cette fonctionnalité est réservée aux agriculteurs.</p>
        <button className="btn" onClick={() => navigate("/")}>Retour à l'accueil</button>
      </div>
    );
  }

  // ── Rendu principal ──────────────────────────────────────────────────────
  return (
    <div className="add-product-form">
      <div className="form-header">
        <h2>✏️ Modifier la denrée</h2>
        <p className="form-subtitle">Mettez à jour les informations de votre denrée agricole</p>
      </div>

      {error && <div className="alert error"><strong>Erreur :</strong> {error}</div>}
      {success && (
        <div className="alert success">
          <strong>Succès :</strong> ✅ Denrée modifiée avec succès ! Redirection en cours…
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-form">

        {/* Informations principales */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">📋</span>
            <h3 className="section-title">Informations principales</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="nom" className="label-required">Nom de la denrée</label>
              <input id="nom" name="nom" type="text" className="form-control"
                value={formData.nom} onChange={handleChange} required
                placeholder="Ex: Tomates Bio, Pommes Golden..." />
              {validationErrors.nom && <span className="field-error">⚠️ {validationErrors.nom}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="categorie" className="label-required">Catégorie</label>
              <select id="categorie" name="categorie" className="form-control"
                value={formData.categorie} onChange={handleChange} required>
                <option value="fruits">Fruits</option>
                <option value="légumes">Légumes</option>
                <option value="viandes">Viandes</option>
                <option value="produits laitiers">Denrées laitières</option>
                <option value="céréales">Céréales</option>
                <option value="épices">Épices</option>
                <option value="autres">Autres</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="etat" className="label-required">État de la denrée</label>
              <select id="etat" name="etat" className="form-control"
                value={formData.etat} onChange={handleChange} required>
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
            <label htmlFor="description">Description de la denrée</label>
            <textarea id="description" name="description" className="form-control"
              value={formData.description} onChange={handleChange} rows="4"
              placeholder="Décrivez votre denrée (qualité, variété, méthode de production...)" />
          </div>
        </div>

        {/* Stock & Prix */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">💰</span>
            <h3 className="section-title">Stock et Prix</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="stock" className="label-required">Quantité en stock</label>
              <input id="stock" name="stock" type="number" className="form-control"
                min="0" value={formData.stock} onChange={handleChange} required placeholder="0" />
              {validationErrors.stock && <span className="field-error">⚠️ {validationErrors.stock}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="unite" className="label-required">Unité de vente</label>
              <select id="unite" name="unite" className="form-control"
                value={formData.unite} onChange={handleChange} required>
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
              <label htmlFor="prix" className="label-required">Prix (FCFA)</label>
              <input id="prix" name="prix" type="number" className="form-control"
                step="0.01" min="0.01" value={formData.prix} onChange={handleChange}
                required placeholder="0.00" />
              {validationErrors.prix && <span className="field-error">⚠️ {validationErrors.prix}</span>}
            </div>
          </div>
        </div>

        {/* Caractéristiques */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">📊</span>
            <h3 className="section-title">Caractéristiques</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="dateRecolte">Date de récolte</label>
              <input id="dateRecolte" name="dateRecolte" type="text" className="form-control"
                value={formData.dateRecolte} onChange={handleDateInput}
                placeholder="jj/mm/aaaa" maxLength={10} />
              {validationErrors.dateRecolte && <span className="field-error">⚠️ {validationErrors.dateRecolte}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="mensurations">Mensurations / Calibre</label>
              <input id="mensurations" name="mensurations" type="text" className="form-control"
                value={formData.mensurations} onChange={handleChange}
                placeholder="Ex: Calibre 60-80mm, Poids moyen 150g..." />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input id="tags" name="tags" type="text" className="form-control"
                value={Array.isArray(formData.tags) ? formData.tags.join(", ") : formData.tags}
                onChange={handleTagsChange} placeholder="bio, local, de saison, sans pesticides..." />
              <small>Séparez les tags par des virgules</small>
            </div>
            <div className="form-group">
              <label htmlFor="certifications">Certifications</label>
              <input id="certifications" name="certifications" type="text" className="form-control"
                value={Array.isArray(formData.certifications) ? formData.certifications.join(", ") : formData.certifications}
                onChange={handleCertificationsChange}
                placeholder="bio, AOP, label rouge, commerce équitable..." />
              <small>Séparez les certifications par des virgules</small>
            </div>
          </div>
        </div>

        {/* Image principale */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">🖼️</span>
            <h3 className="section-title">Image de la denrée</h3>
          </div>
          <div className="form-group">
            <label htmlFor="imageUrl">URL de l'image (optionnel)</label>
            <input id="imageUrl" name="imageUrl" type="url" className="form-control"
              value={formData.imageUrl} onChange={handleChange}
              placeholder="https://example.com/image.jpg" />
            <small>Ou téléchargez une nouvelle image ci-dessous</small>
          </div>
          <div className={`image-upload-area ${isDragging ? "dragging" : ""}`}
            onClick={handleUploadClick} onDragOver={handleDragOver}
            onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ cursor: "pointer" }}>
            <input ref={fileInputRef} type="file"
              accept="image/jpeg, image/jpg, image/png, image/webp"
              onChange={handleFileSelect} style={{ display: "none" }} />
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Aperçu" className="image-preview" />
                {existingImageUrl && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
                    Image actuelle — cliquez pour en changer
                  </p>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(); }}
                  style={{ marginTop: "1rem", padding: "0.5rem 1rem",
                    background: "rgba(255,77,77,0.2)", color: "#ff6b6b",
                    border: "1px solid rgba(255,77,77,0.4)", borderRadius: "8px", cursor: "pointer" }}>
                  ❌ Supprimer l'image
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">📁</div>
                <div className="upload-text">Cliquez pour parcourir ou glissez-déposez une image</div>
                <div className="upload-hint">Formats supportés : JPEG, PNG, WEBP (max. 5 Mo)</div>
              </>
            )}
          </div>
        </div>

        {/* Galerie supplémentaire */}
        <div className="form-section">
          <div className="section-header">
            <span className="section-icon">📷</span>
            <h3 className="section-title">
              Photos supplémentaires{" "}
              <span style={{ fontWeight: 400, fontSize: "0.85em", color: "var(--text-muted)" }}>
                (optionnel, max 4)
              </span>
            </h3>
          </div>
          <div className="gallery-upload-area"
            onClick={() => galleryFiles.length < 4 && galleryInputRef.current?.click()}
            style={{ cursor: galleryFiles.length < 4 ? "pointer" : "default" }}>
            <input ref={galleryInputRef} type="file"
              accept="image/jpeg, image/jpg, image/png, image/webp" multiple
              onChange={(e) => handleGalleryFiles(e.target.files)} style={{ display: "none" }} />
            {galleryPreviews.length === 0 ? (
              <>
                <div className="upload-icon">📷</div>
                <div className="upload-text">Cliquez pour ajouter des photos</div>
                <div className="upload-hint">JPEG, PNG, WEBP · 5 Mo max par photo · max 4 photos</div>
              </>
            ) : (
              <div className="gallery-preview-grid" onClick={(e) => e.stopPropagation()}>
                {galleryPreviews.map((src, i) => (
                  <div key={i} className="gallery-preview-item">
                    <img src={src} alt={`Galerie ${i + 1}`} className="gallery-preview-img" />
                    <button type="button" className="gallery-remove-btn"
                      onClick={() => removeGalleryImage(i)}>×</button>
                  </div>
                ))}
                {galleryFiles.length < 4 && (
                  <div className="gallery-add-more" onClick={() => galleryInputRef.current?.click()}>
                    <span>+</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className={`btn ${loading ? "loading" : ""}`}>
            {loading ? (
              <>
                <span className="loading-spinner" style={{
                  width: "16px", height: "16px", border: "2px solid transparent",
                  borderTop: "2px solid currentColor", borderRadius: "50%",
                  animation: "spin 1s linear infinite", display: "inline-block", marginRight: "8px"
                }} />
                Modification en cours...
              </>
            ) : "✅ Enregistrer les modifications"}
          </button>
          <button type="button" onClick={() => navigate("/mes-produits")} className="btn btn-secondary">
            ↩️ Retour à mes denrées
          </button>
        </div>
        <p className="form-help">* Les champs marqués d'une astérisque sont obligatoires</p>
      </form>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span style={{ marginLeft: "1rem", color: "var(--primary-glow)", fontSize: "1.1rem", fontWeight: "600" }}>
            Traitement en cours...
          </span>
        </div>
      )}
    </div>
  );
};

export default EditProductForm;
