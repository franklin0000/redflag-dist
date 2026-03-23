import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
} from 'chart.js';
import TradeModal from './TradeModal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export default function MarketCard({ market }) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // Mocked or parsed market odds
  const title = market?.title || "Will Taylor Swift & Travis Kelce engage in 2026?";
  const yesPrice = market?.activeRoute?.price || 0.74; // example price
  const noPrice = (1 - yesPrice).toFixed(2);

  const data = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Today'],
    datasets: [
      {
        label: 'YES Odds',
        data: [0.55, 0.60, 0.65, 0.62, 0.70, yesPrice],
        borderColor: '#ec4899', // pink-500
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        tension: 0.4,
        pointRadius: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: { min: 0, max: 1, display: false },
      x: { display: false }
    },
    plugins: { legend: { display: false } }
  };

  return (
    <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-pink-500/20 max-w-sm w-full mx-auto my-4 transition-transform hover:scale-105">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg text-white font-bold leading-tight">{title}</h3>
        <span className="bg-pink-900/50 text-pink-300 text-xs px-2 py-1 rounded">Polymarket</span>
      </div>
      <p className="text-gray-400 text-xs mb-4">Trade shares on social outcomes using USDC.</p>
      
      <div className="h-24 w-full mb-4">
        <Line data={data} options={options} />
      </div>

      <div className="flex justify-between bg-gray-900 rounded-lg p-3">
        <div className="flex flex-col items-center flex-1 border-r border-gray-700">
          <span className="text-green-400 font-extrabold text-2xl">{Math.round(yesPrice * 100)}¢</span>
          <span className="text-gray-500 text-xs font-semibold tracking-wider">YES</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-red-400 font-extrabold text-2xl">{Math.round(noPrice * 100)}¢</span>
          <span className="text-gray-500 text-xs font-semibold tracking-wider">NO</span>
        </div>
      </div>

      <button 
        onClick={() => setTradeModalOpen(true)}
        className="mt-4 w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg"
      >
        Trade Market
      </button>

      {tradeModalOpen && (
        <TradeModal 
          market={market} 
          yesPrice={yesPrice} 
          noPrice={noPrice} 
          onClose={() => setTradeModalOpen(false)} 
        />
      )}
    </div>
  );
}
