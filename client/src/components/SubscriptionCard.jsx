import React from 'react';
import { Gift, Calendar, Clock } from 'lucide-react';

const SubscriptionCard = ({ plan, startDate, endDate, daysLeft }) => {
  const planColors = {
    BLEU: '#1e88e5',
    GOLD: '#ffb300',
    PLATINUM: '#78909c'
  };

  return (
    <div className="subscription-card" style={{ borderColor: planColors[plan] }}>
      <div className="card-header">
        <Gift size={24} />
        <h2>Votre abonnement {plan}</h2>
      </div>
      
      <div className="card-dates">
        <div className="date-item">
          <Calendar size={16} />
          <span>Début: {new Date(startDate).toLocaleDateString()}</span>
        </div>
        
        <div className="date-item">
          <Calendar size={16} />
          <span>Fin: {new Date(endDate).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="card-footer">
        <Clock size={16} />
        <span>{daysLeft} jours restants</span>
      </div>
    </div>
  );
};

export default SubscriptionCard;