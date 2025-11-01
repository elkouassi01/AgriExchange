import React from 'react';
import { RefreshCw } from 'lucide-react';

const RenewButton = ({ onClick }) => {
  return (
    <button onClick={onClick} className="renew-btn">
      <RefreshCw size={18} />
      Renouveler l'abonnement
    </button>
  );
};

export default RenewButton;