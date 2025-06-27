import React, { useEffect, useState } from 'react';
import api from '../services/axiosConfig'; // ton instance axios configurée

const ProductAccessChecker = ({ productId }) => {
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) return;

    const verifierAcces = async () => {
      setLoading(true);
      setError(null);

      try {
        // Appel API, on suppose que l'API retourne { accessGranted: true/false }
        const response = await api.get(`/users/me/products/${productId}/can-access`);
        setAccessGranted(response.data.accessGranted === true);
      } catch (err) {
        console.error('Erreur vérification accès produit:', err);
        if (err.response && err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError('Erreur inconnue lors de la vérification d\'accès.');
        }
      } finally {
        setLoading(false);
      }
    };

    verifierAcces();
  }, [productId]);

  if (loading) {
    return <p>Vérification de l'accès au produit...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Erreur : {error}</p>;
  }

  if (!accessGranted) {
    return <p style={{ color: 'orange' }}>Accès refusé : vous avez atteint votre quota ou votre abonnement est inactif.</p>;
  }

  return <p style={{ color: 'green' }}>Accès au produit autorisé. Vous pouvez consulter les détails.</p>;
};

export default ProductAccessChecker;
