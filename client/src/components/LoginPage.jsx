import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./LoginPage.css";
import api from "../services/axiosConfig";

const LoginPage = () => {
  const { user, login } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 🧭 Redirige automatiquement si déjà connecté
  useEffect(() => {
    if (user) {
      navigate(getRoleRedirect(user.role), { replace: true });
    }
  }, [user, navigate]);

  // 🔀 Fonction de redirection selon le rôle
  const getRoleRedirect = (role) => {
    switch (role) {
      case "admin":
        return "/admin/dashboard";
      case "agriculteur":
        return "/profil-agriculteur";
      case "consommateur":
        return "/profil-consommateur";
      default:
        return "/";
    }
  };

  // 🔐 Soumission du formulaire de connexion
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/connexion", {
        email,
        motDePasse,
      });

      if (!response.data?.utilisateur || !response.data?.token) {
        setError("Réponse invalide du serveur");
        return;
      }

      // ✅ Connexion réussie
      login(response.data.utilisateur, response.data.token);

      // 🚀 Rediriger selon le rôle
      navigate(getRoleRedirect(response.data.utilisateur.role), { replace: true });

    } catch (err) {
      handleLoginError(err);
    } finally {
      setLoading(false);
    }
  };

  // ⚠️ Gestion des erreurs serveur
  const handleLoginError = (err) => {
    if (err.response) {
      if (err.response.status === 401) {
        setError("Email ou mot de passe incorrect");
      } else if (err.response.status === 403) {
        setError("Compte désactivé. Contactez le support.");
      } else if (err.response.status === 429) {
        setError("Trop de tentatives. Veuillez réessayer plus tard.");
      } else {
        setError(err.response.data?.message || `Erreur ${err.response.status}`);
      }
    } else if (err.request) {
      setError("Serveur injoignable. Vérifiez votre connexion internet.");
    } else {
      setError("Erreur inattendue : " + err.message);
    }
  };

  // 👁️‍🗨️ Afficher / cacher le mot de passe
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };



  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Connexion</h2>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span> {error}
          </div>
        )}

        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Mot de passe</label>
          <div className="password-input-container">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          <div className="forgot-password">
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </div>
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={loading}
        >
          {loading ? "Connexion en cours..." : "Se connecter"}
        </button>

<div className="login-footer">
           <p>Pas encore de compte ?</p>
           <div className="register-links">
             <Link to="/inscription?type=consommateur">Créer un compte Consommateur</Link>
             <Link to="/inscription?type=agriculteur">Créer un compte Agriculteur</Link>
           </div>
         </div>
      </form>
    </div>
  );
};

export default LoginPage;
