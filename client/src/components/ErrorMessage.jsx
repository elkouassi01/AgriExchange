import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorMessage.css';

const ErrorMessage = ({ message, onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="error-message">
      <h3>Erreur</h3>
      <p>{message}</p>
      <div className="error-actions">
        {onRetry && (
          <button onClick={onRetry} className="error-button">
            Réessayer
          </button>
        )}
        <button onClick={() => navigate('/')} className="error-button">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};

export default ErrorMessage;