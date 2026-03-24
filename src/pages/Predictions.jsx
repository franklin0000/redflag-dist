import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MarketCard from '../components/Polymarket/MarketCard';

export default function Predictions() {
  const [markets, setMarkets] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const url = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL}/api/polymarket/markets` 
          : 'http://localhost:10000/api/polymarket/markets';
        const res = await fetch(url);
        const data = await res.json();
        
        setMarkets(Array.isArray(data) ? data : data.events || data.markets || []);
      } catch (err) {
        console.error('Failed to fetch markets', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  const FILTERS = [
    { id: 'All', icon: '🔥', label: 'All' },
    { id: 'Social', icon: '💃', label: 'Social' },
    { id: 'Crypto', icon: '🪙', label: 'Crypto' },
    { id: 'Sport', icon: '🏆', label: 'Sport' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0c] bg-opacity-100 text-white relative">
       {/* Ambient Backlight for super premium vibe */}
       <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-pink-900/20 via-purple-900/10 to-transparent pointer-events-none" />
       
       {/* Sticky Premium Header */}
       <div className="pt-12 pb-4 px-5 border-b border-white/[0.04] bg-black/40 sticky top-0 z-30 backdrop-blur-2xl">
         <motion.h1 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="text-3xl font-black mb-6 flex items-center gap-3 tracking-tight"
         >
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
             <span className="material-icons text-white">ssid_chart</span>
           </div>
           <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
             Live Markets
           </span>
         </motion.h1>
         
         {/* Sleek Pills */}
         <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
           {FILTERS.map(f => (
             <button 
               key={f.id}
               onClick={() => setFilter(f.id)}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap font-semibold text-sm transition-all duration-300 ${
                 filter === f.id 
                   ? 'bg-white text-black shadow-lg shadow-white/20 scale-105' 
                   : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
               }`}
             >
               <span>{f.icon}</span> {f.label}
             </button>
           ))}
         </div>
       </div>

       {/* Content Feed */}
       <div className="p-5 flex flex-col items-center">
         {loading ? (
             <div className="flex flex-col items-center justify-center h-64 opacity-60">
               <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="font-bold tracking-widest uppercase text-xs text-pink-500">Synchronizing Oracle</p>
             </div>
         ) : markets.length > 0 ? (
           <div className="w-full max-w-lg grid gap-8 pb-24 mx-auto">
             {markets.map((m, idx) => (
               <MarketCard key={m.id || idx} market={m} filter={filter} />
             ))}
           </div>
         ) : (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="text-center text-gray-500 py-16 mt-10 bg-white/5 rounded-3xl border border-white/5 w-full max-w-sm"
           >
             <span className="material-icons text-6xl mb-4 text-gray-600">cloud_off</span>
             <p className="font-semibold text-lg text-white">Network Congestion</p>
             <p className="text-sm mt-2 px-6 leading-relaxed">Oracle markets are currently refreshing. Please verify your connection.</p>
           </motion.div>
         )}
       </div>
    </div>
  );
}
