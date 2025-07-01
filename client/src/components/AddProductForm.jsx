import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AddProductForm.css";
import { useUser } from "../contexts/UserContext";

const AddProductForm = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading, fetchUser } = useUser(); // Contexte utilisateur

  const [formData, setFormData] = useState({
    nom: "",
    categorie: "",
    quantite: "",
    unite: "kg",
    description: "",
    prix: "",
    dateRecolte: "",
    image: null,
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // ⛔ Redirection si pas connecté
  useEffect(() => {
    if (!userLoading && !user) {
      navigate("/login");
    }
  }, [user, userLoading, navigate]);

  // ✅ Gestion champ texte
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ Gestion image
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, image: file }));

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // 🛑 Vérification utilisateur
    if (userLoading) {
      setError("Chargement du profil...");
      return;
    }

    if (!user || !user._id) {
      setError("❌ Vous devez être connecté pour ajouter un produit.");
      return;
    }

    const form = new FormData();
    for (const key in formData) {
      form.append(key, formData[key]);
    }

    try {
      const response = await axios.post("http://localhost:5000/api/v1/products", form, {
        withCredentials: true, // 👈 Important pour envoyer le cookie JWT
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 201) {
        setSuccess(true);
        setFormData({
          nom: "",
          categorie: "",
          quantite: "",
          unite: "kg",
          description: "",
          prix: "",
          dateRecolte: "",
          image: null,
        });
        setImagePreview(null);
        fetchUser(); // Optionnel : recharge le contexte utilisateur
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Erreur lors de l'ajout du produit. Veuillez réessayer.";
      setError(msg);
    }
  };

  // 🟡 Pendant chargement user
  if (userLoading) {
    return (
      <div className="add-product-form">
        <p>Chargement de votre session...</p>
      </div>
    );
  }

  return (
    <div className="add-product-form">
      <h2>Ajouter un produit</h2>

      {error && <p className="error-message">❌ {error}</p>}
      {success && <p className="success-message">✅ Produit ajouté avec succès !</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Nom du produit:
          <input type="text" name="nom" value={formData.nom} onChange={handleChange} required />
        </label>

        <label>
          Catégorie:
          <input type="text" name="categorie" value={formData.categorie} onChange={handleChange} required />
        </label>

        <label>
          Quantité:
          <input type="number" name="quantite" value={formData.quantite} onChange={handleChange} required />
        </label>

        <label>
          Unité:
          <select name="unite" value={formData.unite} onChange={handleChange}>
            <option value="kg">Kg</option>
            <option value="tonne">Tonne</option>
            <option value="litre">Litre</option>
            <option value="unité">Unité</option>
          </select>
        </label>

        <label>
          Description:
          <textarea name="description" value={formData.description} onChange={handleChange} />
        </label>

        <label>
          Prix:
          <input type="number" name="prix" value={formData.prix} onChange={handleChange} required />
        </label>

        <label>
          Date de récolte:
          <input type="date" name="dateRecolte" value={formData.dateRecolte} onChange={handleChange} required />
        </label>

        <label>
          Image du produit:
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        {imagePreview && <img src={imagePreview} alt="Aperçu du produit" className="image-preview" />}

        <button type="submit">Ajouter</button>
      </form>
    </div>
  );
};

export default AddProductForm;
