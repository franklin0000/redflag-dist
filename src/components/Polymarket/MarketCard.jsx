import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import TradeModal from './TradeModal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function MarketCard({ market, filter }) {
  const [tradeModalOpen, setTradeModalOpen] = useState(false);

  // If the user selects a filter that doesn't match the mock logic, we simply hide it
  // For MVP: display all if filter is "All"
  if (filter && filter !== 'All' && market?.category !== filter) {
    // We mock categories based on string since polymarket sometimes lacks direct category filtering in this endpoint
    const text = (market?.title || "").toLowerCase();
    const isCrypto = text.includes('bitcoin') || text.includes('eth');
    const isSport = text.includes('super bowl') || text.includes('nfl');
    const isSocial = !isCrypto && !isSport;
    
    if (filter === 'Crypto' && !isCrypto) return null;
    if (filter === 'Sport' && !isSport) return null;
    if (filter === 'Social' && !isSocial) return null;
  }

  const title = market?.title || "Will Taylor Swift & Travis Kelce engage in 2026?";
  const yesPrice = market?.yesPrice ?? 0.74;
  const noPrice = market?.noPrice ?? parseFloat((1 - yesPrice).toFixed(4));
  
  // Decide color scheme based on current odds (just a visual feature for premium feel)
  const isVolatile = yesPrice > 0.3 && yesPrice < 0.7;
  const primaryColor = isVolatile ? '#ec4899' : '#10b981'; // pink or emerald
  const bgColor = isVolatile ? 'rgba(236, 72, 153, 0.1)' : 'rgba(16, 185, 129, 0.1)';

  const data = {
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Today'],
    datasets: [
      {
        label: 'YES Odds',
        data: [0.55, 0.60, 0.65, 0.62, 0.70, yesPrice],
        borderColor: primaryColor,
        backgroundColor: bgColor,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 1, display: false },
      x: { display: false }
    },
    plugins: { legend: { display: false } },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.01, translateY: -4 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative overflow-hidden bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-2xl w-full"
    >
      {/* Decorative ambient blurred glows */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-pink-500/20 blur-[50px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header content */}
        <div className="flex justify-between items-start mb-3 gap-4">
          <h3 className="text-xl text-white font-extrabold leading-snug tracking-tight">
            {title}
          </h3>
          <span className="bg-white/10 border border-white/5 text-gray-300 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap">
            Polymarket
          </span>
        </div>
        
        <p className="text-gray-400/80 text-sm mb-6 flex items-center gap-1.5 font-medium">
          <span className="material-icons text-sm text-pink-500">trending_up</span>
          Vol. ${(market?.volume || 145000).toLocaleString(undefined, {maximumFractionDigits:0})}
        </p>
        
        {/* Dynamic Line Chart */}
        <div className="h-28 w-full mb-6 relative">
          <Line data={data} options={options} />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none" />
        </div>

        {/* Odds Box */}
        <div className="flex justify-between bg-black/40 border border-white/5 rounded-2xl p-4 mb-5 shadow-inner backdrop-blur-md">
          <div className="flex flex-col items-center flex-1 border-r border-white/10">
            <span className="text-emerald-400 font-black text-3xl tracking-tighter">
              {Math.round(yesPrice * 100)}<span className="text-lg opacity-80">¢</span>
            </span>
            <span className="text-gray-500 text-xs font-bold tracking-widest mt-1">YES</span>
          </div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-rose-400 font-black text-3xl tracking-tighter">
              {Math.round(noPrice * 100)}<span className="text-lg opacity-80">¢</span>
            </span>
            <span className="text-gray-500 text-xs font-bold tracking-widest mt-1">NO</span>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={() => setTradeModalOpen(true)}
          className="w-full bg-white text-black hover:bg-gray-200 hover:scale-[1.02] transform transition-all font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]"
        >
          Trade Market
        </button>
      </div>

      {tradeModalOpen && (
        <TradeModal 
          market={market} 
          yesPrice={yesPrice} 
          noPrice={noPrice} 
          onClose={() => setTradeModalOpen(false)} 
        />
      )}
    </motion.div>
  );
}
