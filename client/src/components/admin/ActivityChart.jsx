import React, { useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Title, Tooltip, Legend
);

const fmtMoney = (n) => Number(n || 0).toLocaleString('fr-FR');

const ActivityChart = ({ data }) => {
  const chartRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 220, color: '#94a3b8', gap: 8 }}>
        <div style={{ fontSize: '2rem' }}>📊</div>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>Aucune donnée sur les 6 derniers mois</p>
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, family: "'Inter', sans-serif" },
          usePointStyle: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        padding: 12,
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont:  { size: 13, family: "'Inter', sans-serif" },
        callbacks: {
          label: (ctx) => {
            if (ctx.datasetIndex === 0) return `  Transactions : ${ctx.parsed.y}`;
            return `  Revenus : ${fmtMoney(ctx.parsed.y)} XOF`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, family: "'Inter', sans-serif" } },
      },
      y: {
        type: 'linear',
        position: 'left',
        beginAtZero: true,
        grid: { color: 'rgba(241, 245, 249, 0.8)' },
        ticks: {
          font: { size: 11, family: "'Inter', sans-serif" },
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Transactions',
          font: { size: 11, family: "'Inter', sans-serif" },
          color: '#64748b',
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { size: 11, family: "'Inter', sans-serif" },
          callback: (v) => `${fmtMoney(v)} `,
        },
        title: {
          display: true,
          text: 'Revenus (XOF)',
          font: { size: 11, family: "'Inter', sans-serif" },
          color: '#64748b',
        },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
  };

  const chartData = {
    labels: data.map((d) => d.mois),
    datasets: [
      {
        type: 'bar',
        label: 'Transactions',
        data: data.map((d) => d.transactions),
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 0.8)',
        borderWidth: 1,
        borderRadius: 5,
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Revenus',
        data: data.map((d) => d.revenue),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#16a34a',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
        yAxisID: 'y1',
        order: 1,
      },
    ],
  };

  return (
    <div style={{ height: 260 }}>
      <Bar ref={chartRef} options={options} data={chartData} />
    </div>
  );
};

export default ActivityChart;
