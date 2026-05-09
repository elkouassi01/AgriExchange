import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/axiosConfig';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'success'
  const [telephone, setTelephone] = useState('');
  const [otp, setOtp] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmMotDePasse, setConfirmMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { telephone });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur serveur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (nouveauMotDePasse !== confirmMotDePasse) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (nouveauMotDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { telephone, otp, nouveauMotDePasse });
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Code incorrect ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <div className="forgot-icon">🔒</div>
        <h2>Mot de passe oublié</h2>

        {step === 'phone' && (
          <>
            <p className="forgot-subtitle">
              Entrez votre numéro WhatsApp. Vous recevrez un code de vérification.
            </p>
            <form onSubmit={handleRequestOtp} className="forgot-form">
              <div className="input-group">
                <label htmlFor="telephone">Numéro WhatsApp</label>
                <input
                  id="telephone"
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="ex: +2250700000000"
                  required
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
              {error && <p className="forgot-error">{error}</p>}
              <button type="submit" className="forgot-button" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Recevoir le code'}
              </button>
              <Link to="/connexion" className="back-link">← Retour à la connexion</Link>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="forgot-subtitle">
              Un code a été envoyé sur WhatsApp au <strong>{telephone}</strong>.
              Saisissez-le ci-dessous avec votre nouveau mot de passe.
            </p>
            <form onSubmit={handleResetPassword} className="forgot-form">
              <div className="input-group">
                <label htmlFor="otp">Code reçu sur WhatsApp</label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              <div className="input-group">
                <label htmlFor="nouveau-mdp">Nouveau mot de passe</label>
                <div className="password-input-container">
                  <input
                    id="nouveau-mdp"
                    type={showPassword ? 'text' : 'password'}
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    required
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="confirm-mdp">Confirmer le mot de passe</label>
                <input
                  id="confirm-mdp"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmMotDePasse}
                  onChange={(e) => setConfirmMotDePasse(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="forgot-error">{error}</p>}
              <button type="submit" className="forgot-button" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
              </button>
              <button
                type="button"
                className="back-link resend-link"
                onClick={() => { setStep('phone'); setError(''); setOtp(''); }}
              >
                Renvoyer un code
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="forgot-success">
            <span className="success-icon">✅</span>
            <p>Votre mot de passe a été mis à jour avec succès !</p>
            <Link to="/connexion" className="forgot-button" style={{ textAlign: 'center', textDecoration: 'none' }}>
              Se connecter
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
