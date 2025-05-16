import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import "./LoginPage.css";

const LoginPage = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // 🚧 Ici, on simulera un utilisateur. Plus tard, tu enverras ça au backend.
    if (email === "agri@ex.com" && password === "1234") {
      setUser({ id: 1, nom: "Jean Agri", role: "agriculteur" });
      navigate("/profil-agriculteur");
    } else if (email === "conso@ex.com" && password === "1234") {
      setUser({ id: 2, nom: "Léa Conso", role: "consommateur" });
      navigate("/profil-consommateur");
    } else {
      alert("Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>Connexion</h2>
        <input
          type="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
};

export default LoginPage;
