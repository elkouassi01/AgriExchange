import React, { useEffect, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Enregistrer les composants nécessaires de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ActivityChart = ({ data, title = 'Activité des utilisateurs', subtitle }) => {
  const chartRef = useRef(null);
  
  // Options de configuration du graphique
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
            family: "'Inter', sans-serif"
          },
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        padding: {
          top: 10,
          bottom: 20
        }
      },
      subtitle: {
        display: !!subtitle,
        text: subtitle,
        font: {
          size: 14,
          family: "'Inter', sans-serif"
        },
        padding: {
          bottom: 30
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        titleFont: {
          size: 14,
          family: "'Inter', sans-serif"
        },
        bodyFont: {
          size: 14,
          family: "'Inter', sans-serif"
        },
        callbacks: {
          label: function(context) {
            return `Transactions: ${context.parsed.y}`;
          },
          title: function(context) {
            return `Jour: ${context[0].label}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(241, 245, 249, 0.5)'
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        },
        title: {
          display: true,
          text: 'Nombre de transactions',
          font: {
            size: 14,
            weight: '500',
            family: "'Inter', sans-serif"
          },
          padding: {
            top: 10,
            bottom: 10
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif"
          }
        },
        title: {
          display: true,
          text: 'Jours',
          font: {
            size: 14,
            weight: '500',
            family: "'Inter', sans-serif"
          },
          padding: {
            top: 10
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Créer un gradient pour les barres
  const getGradient = (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
    gradient.addColorStop(1, 'rgba(14, 165, 233, 0.2)');
    return gradient;
  };

  // Formatage des données pour le graphique
  const chartData = {
    labels: data.map(item => item.jour),
    datasets: [
      {
        label: 'Transactions',
        data: data.map(item => item.transactions),
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return;
          return getGradient(ctx);
        },
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };

  return (
    <div className="activity-chart-container">
      <div className="chart-wrapper">
        <Bar ref={chartRef} options={options} data={chartData} />
      </div>
      
      {data.length === 0 && (
        <div className="no-data-message">
          <div className="no-data-icon">📊</div>
          <h3>Aucune donnée disponible</h3>
          <p>Les données d'activité seront affichées ici lorsqu'elles seront disponibles</p>
        </div>
      )}
    </div>
  );
};

export default ActivityChart;