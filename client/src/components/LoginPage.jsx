import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext"; // ✅ Accès au contexte utilisateur global
import "./LoginPage.css"; // ✅ Style CSS de la page

const LoginPage = () => {
  const { login } = useUser(); // Fonction pour enregistrer l’utilisateur dans le contexte
  const navigate = useNavigate(); // Permet la redirection après connexion

  // 🎯 États du formulaire
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Pour afficher "Connexion en cours..."

  // 🔐 Fonction de traitement de la connexion
  const handleLogin = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    setError(""); // Réinitialise les erreurs
    setLoading(true); // Active l’état de chargement

    try {
      // 🔄 Envoie les infos de connexion à l'API backend
      const response = await fetch("http://localhost:5000/api/v1/auth/connexion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔐 Permet l’envoi de cookies httpOnly
        body: JSON.stringify({ email, motDePasse }), // Doit correspondre au backend
      });

      const data = await response.json(); // ⬅ Récupère la réponse JSON

      // ⚠ Si erreur côté serveur (ex: 401 ou 403)
      if (!response.ok) {
        setError(data.message || "Erreur lors de la connexion");
        return;
      }

      // ⚠ Cas où la réponse ne contient pas l’utilisateur
      if (!data.utilisateur) {
        setError("Réponse invalide du serveur");
        return;
      }

      // ✅ Connexion réussie → enregistre dans le contexte
      login(data.utilisateur);

      // 🚀 Redirection automatique selon le rôle
      switch (data.utilisateur.role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "agriculteur":
          navigate("/profil-agriculteur");
          break;
        case "consommateur":
          navigate("/profil-consommateur");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      // ❌ Erreur réseau ou serveur inattendu
      console.error("Erreur de connexion :", err);
      setError("Erreur serveur, veuillez réessayer plus tard.");
    } finally {
      setLoading(false); // 🔄 Fin du chargement
    }
  };

  return (
    <div className="login-container">
      {/* 🧾 Formulaire de connexion */}
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Connexion</h2>

        {/* 🔴 Affichage des erreurs */}
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* ✉️ Champ email */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Adresse e-mail"
          required
          disabled={loading}
          autoComplete="email"
          aria-label="Adresse e-mail"
        />

        {/* 🔒 Champ mot de passe */}
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="Mot de passe"
          required
          disabled={loading}
          autoComplete="current-password"
          aria-label="Mot de passe"
        />

        {/* 🔘 Bouton de connexion */}
        <button type="submit" disabled={loading} aria-busy={loading}>
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>

        {/* 🔗 Liens vers les inscriptions */}
        <div className="login-footer">
          <p>Pas encore de compte ?</p>
          <p>
            <Link to="/inscription">Créer votre compte Consommateur</Link>
          </p>
          <p>
            <Link to="/inscription?type=agriculteur&formule=BLEU">
              Créer votre compte Agriculteur
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;
