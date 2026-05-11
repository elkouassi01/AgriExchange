import React from 'react';
import './StatCard.css';

// change: number (percentage, can be negative) — shown as % badge
// sub:    string — shown as a small tag below the value (e.g. "+3 ce mois")
const StatCard = ({ title, value, icon, change, sub, description, variant }) => {
  const hasChange = typeof change === 'number' && change !== 0;
  const isPositive = !hasChange || change >= 0;

  return (
    <div className={`stat-card ${variant ? `stat-card--${variant}` : ''}`}>
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <div style={{ flex: 1 }}>
          <p className="card-title">{title}</p>
          <p className="card-value">{value}</p>
          {sub && <span className="card-sub">{sub}</span>}
        </div>
      </div>

      <div className={`card-footer ${isPositive ? 'positive' : 'negative'}`}>
        {hasChange && (
          <div className="change-indicator">
            {isPositive ? (
              <svg className="change-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="change-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span>{Math.abs(change)}% vs mois préc.</span>
          </div>
        )}
        <div className="card-description">{description}</div>
      </div>
    </div>
  );
};

export default StatCard;
