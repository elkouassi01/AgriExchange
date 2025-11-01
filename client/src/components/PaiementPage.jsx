import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const PaiementPage = () => {
  const [searchParams] = useSearchParams();
  const formule = searchParams.get("formule");
  const montant = searchParams.get("montant");
  const email = searchParams.get("email");

  useEffect(() => {
    // Assurez-vous que le script CinetPay est chargé
    if (window.CinetPay) {
      const transaction_id = Date.now().toString(); // identifiant unique

      window.CinetPay.setConfig({
        apikey: '8937149296838988c80faf0.18612017', // remplacez par votre vraie clé
        site_id: '105896693',         // remplacez par votre vrai site ID
        notify_url: 'https://votre-api.com/notification', // ou un lien factice pour tester
        mode: 'TEST' // ou 'PRODUCTION'
      });

      window.CinetPay.getCheckout({
        transaction_id: transaction_id,
        amount: montant,
        currency: 'XOF',
        channels: 'ALL',
        description: `Paiement de la formule ${formule}`,
        customer_name: 'Client',
        customer_email: email,
        customer_phone_number: '',
        customer_address: '',
        customer_city: '',
        customer_country: 'CI'
      });

      window.CinetPay.waitResponse(function(data) {
        console.log(data);
        if (data.status === "REFUSED") {
          alert("Le paiement a échoué");
        } else if (data.status === "ACCEPTED") {
          alert("Paiement réussi !");
          // redirection ou enregistrement en base
        }
      });

      window.CinetPay.onError(function(data) {
        console.error(data);
        alert("Erreur de paiement");
      });
    }
  }, [formule, montant, email]);

  return (
    <div>
      <h1>Redirection vers le paiement CinetPay...</h1>
      <p>Formule : {formule}</p>
      <p>Montant : {montant} FCFA</p>
      <p>Email : {email}</p>
    </div>
  );
};

export default PaiementPage;
