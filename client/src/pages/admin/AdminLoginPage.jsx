import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Ajout de Link ici
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import './AdminLoginPage.css';

const AdminLoginPage = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (credentials.email === 'admin@ex.com' && credentials.password === 'admin1234') {
        const adminData = {
          id: 'admin_001',
          nom: 'Administrateur AgriExchange',
          email: 'admin@ex.com',
          role: 'admin'
        };
        
        login(adminData);
        navigate('/admin/dashboard');
      } else {
        throw new Error('Identifiants incorrects. Veuillez réessayer.');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-icon-container">
          <svg 
            className="admin-icon" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
        </div>
        
        <h1 className="admin-title">Connexion Administrateur</h1>
        <p className="admin-subtitle">
          Accédez au tableau de bord d'administration AgriExchange
        </p>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="admin@ex.com"
              value={credentials.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Mot de passe</label>
            <div className="password-container">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="input-field"
                placeholder="••••••••"
                value={credentials.password}
                onChange={handleChange}
              />
              <span 
                className="toggle-password" 
                onClick={togglePasswordVisibility}
                style={{ cursor: 'pointer' }}
              >
                {showPassword ? (
                  <i className="fas fa-eye-slash"></i>
                ) : (
                  <i className="fas fa-eye"></i>
                )}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? (
              <>
                <svg 
                  className="spinner" 
                  style={{ width: '20px', height: '20px' }}
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connexion en cours...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Se connecter
              </>
            )}
          </button>
        </form>
        
        <div className="security-note">
          <strong>Sécurité:</strong> Cette interface est réservée aux administrateurs certifiés AgriExchange.
          Toute tentative d'accès non autorisé sera enregistrée.
        </div>

        {/* Nouveau lien vers la page d'accueil */}
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/" className="home-link">
            Retour à la page d'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
