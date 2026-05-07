import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/axiosConfig';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // On affiche toujours le même message pour des raisons de sécurité
    } finally {
      setStatus('success');
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <div className="forgot-icon">🔒</div>
        <h2>Mot de passe oublié</h2>
        <p className="forgot-subtitle">
          Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.
        </p>

        {status === 'success' ? (
          <div className="forgot-success">
            <span className="success-icon">✅</span>
            <p>Si un compte est associé à <strong>{email}</strong>, vous recevrez un message sous peu.</p>
            <Link to="/connexion" className="back-link">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-form">
            <div className="input-group">
              <label htmlFor="email">Adresse email</label>
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

            <button type="submit" className="forgot-button" disabled={loading}>
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>

            <Link to="/connexion" className="back-link">← Retour à la connexion</Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
