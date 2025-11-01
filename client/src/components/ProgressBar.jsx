import React from 'react';

const ProgressBar = ({ percentage, label }) => {
  return (
    <div className="progress-container">
      <div className="progress-labels">
        <span>0%</span>
        <span>{label}</span>
        <span>100%</span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      
      <div className="progress-percentage">
        {percentage}%
      </div>
    </div>
  );
};

export default ProgressBar;