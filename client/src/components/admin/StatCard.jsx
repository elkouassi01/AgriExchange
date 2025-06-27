// src/components/admin/StatCard.jsx
import React from 'react';

const StatCard = ({ title, value, icon, change, description }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="stat-card">
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <div>
          <p className="card-title">{title}</p>
          <p className="card-value">{value}</p>
        </div>
      </div>
      
      <div className={`card-footer ${isPositive ? 'positive' : 'negative'}`}>
        <div className="change-indicator">
          {isPositive ? (
            <svg className="change-icon" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="change-icon" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
          <span>{Math.abs(change)}%</span>
        </div>
        <div className="card-description">{description}</div>
      </div>
    </div>
  );
};

export default StatCard;