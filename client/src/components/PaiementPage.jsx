import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../config/api';

const PaiementPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const formule = searchParams.get('formule');
  const montant = searchParams.get('montant');
  const email = searchParams.get('email');

  useEffect(() => {
    const initiatePayment = async () => {
      if (!montant || !formule) {
        navigate('/offres');
        return;
      }

      try {
        const response = await fetch(buildApiUrl('/paiement/initiate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseInt(montant, 10),
            description: `Paiement de la formule ${formule}`,
            customer_name: 'Client',
            customer_email: email || 'guest@vivrimarket.com',
            customer_phone: '',
            notify_url: window.location.origin + '/api/v1/cinetpay-notify',
            return_url: window.location.origin + '/paiement-reussi',
            cancel_url: window.location.origin + '/paiement-echec',
            user_type: 'consommateur',
            formule: formule,
            user_email: email,
          }),
        });

        const data = await response.json();
        if (data.success && data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          navigate('/paiement-echec');
        }
      } catch (err) {
        console.error('[PaiementPage]', err);
        navigate('/paiement-echec');
      }
    };

    initiatePayment();
  }, [formule, montant, email, navigate]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Redirection vers le paiement CinetPay...</h1>
      <p>Formule : {formule}</p>
      <p>Montant : {montant} FCFA</p>
      <p>Email : {email}</p>
    </div>
  );
};

export default PaiementPage;
