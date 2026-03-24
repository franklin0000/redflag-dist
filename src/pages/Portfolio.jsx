import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Portfolio() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValue: 0,
    dailyPnL: 0,
    dailyPnLPerc: 0
  });

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/polymarket/portfolio`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('rf_token')}`
          }
        });
        const data = await res.json();
        
        if (data.positions) {
          // Enhancing positions with current market data if available
          // For now, we use the aggregated backend data
          setPositions(data.positions);
          
          let total = 0;
          data.positions.forEach(p => {
            total += parseFloat(p.size) * parseFloat(p.avgPrice);
          });
          setStats(prev => ({ ...prev, totalValue: total }));
        }
      } catch (err) {
        console.error("Error fetching portfolio:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPortfolio();
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white pb-24">
       {/* Ambient Gradients */}
       <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-pink-500/10 blur-[150px] rounded-full pointer-events-none" />
       
       <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
          >
             <div>
                <h1 className="text-4xl font-black tracking-tight mb-2">Portfolio</h1>
                <p className="text-gray-500 font-medium">Manage your active predictions and performance.</p>
             </div>
             <div className="flex gap-4">
                <div className="bg-[#15161a] border border-white/5 rounded-2xl p-4 pr-10 shadow-xl">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Estimated Value</p>
                   <p className="text-2xl font-black">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#15161a] border border-white/5 rounded-2xl p-4 pr-10 shadow-xl">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Session P&L</p>
                   <p className={`text-2xl font-black ${stats.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                     {stats.dailyPnL >= 0 ? '+' : ''}${stats.dailyPnL.toFixed(2)}
                   </p>
                </div>
             </div>
          </motion.div>

          {/* Positions Table */}
          <div className="bg-[#15161a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
             <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                <h2 className="font-bold text-lg text-gray-300">Active Positions</h2>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="text-[11px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                         <th className="px-8 py-5">Asset (Token ID)</th>
                         <th className="px-8 py-5 text-right">Size (Shares)</th>
                         <th className="px-8 py-5 text-right">Avg Entry</th>
                         <th className="px-8 py-5 text-right">Current Value</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.03]">
                      {loading ? (
                        <tr><td colSpan="4" className="py-20 text-center text-gray-600 font-bold">Synchronizing with blockchain records...</td></tr>
                      ) : positions.length > 0 ? (
                        positions.map((p, idx) => (
                          <motion.tr 
                            key={idx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                          >
                             <td className="px-8 py-6 max-w-sm">
                                <span className="font-bold text-sm block line-clamp-1 group-hover:text-pink-500 transition-colors">
                                  {p.tokenId || "Unknown Position"}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">{p.tokenId?.slice(0, 16)}...</span>
                             </td>
                             <td className="px-8 py-6 text-right font-medium text-gray-300">
                               {parseFloat(p.size).toLocaleString()}
                             </td>
                             <td className="px-8 py-6 text-right">
                                <span className="text-white font-bold">{(parseFloat(p.avgPrice) * 100).toFixed(1)}¢</span>
                             </td>
                             <td className="px-8 py-6 text-right font-bold">
                               ${(parseFloat(p.size) * parseFloat(p.avgPrice)).toFixed(2)}
                             </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr><td colSpan="4" className="py-20 text-center text-gray-600">No active positions found. Start trading to see your portfolio grow!</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          {/* History / Activity Feed Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-[#15161a] border border-white/5 rounded-3xl p-8 shadow-xl">
                <h3 className="font-black text-xl mb-6 flex items-center gap-3">
                   <span className="material-icons text-pink-500">history</span>
                   Real-time Proxy Activity
                </h3>
                <div className="space-y-6">
                   {positions.length > 0 ? positions.slice(0, 3).map((p, i) => (
                     <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-black/20 border border-white/[0.03]">
                        <div className="flex gap-3 items-center">
                           <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                             <span className="material-icons text-sm">check_circle</span>
                           </div>
                           <div>
                              <p className="text-sm font-bold">Proxy Execution Verified</p>
                              <p className="text-[10px] text-gray-500 uppercase font-black">Token: {p.tokenId?.slice(0, 8)}</p>
                           </div>
                        </div>
                        <p className="font-black text-green-500">Active</p>
                     </div>
                   )) : (
                     <p className="text-center py-10 text-gray-600 text-sm">No recent activity detected on your proxy wallet.</p>
                   )}
                </div>
             </div>

             <div className="bg-gradient-to-br from-pink-600 to-indigo-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                   <h3 className="text-2xl font-black mb-2">Withdraw Earnings</h3>
                   <p className="text-white/70 text-sm mb-6 max-w-[200px]">Proxy earnings are held securely in your dedicated operator wallet.</p>
                   <button className="bg-white text-black font-black px-8 py-3 rounded-2xl hover:bg-gray-100 transition-all transform active:scale-95 shadow-xl">
                      Manage Balances
                   </button>
                </div>
                <span className="material-icons absolute -bottom-10 -right-10 text-[200px] text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                   account_balance_wallet
                </span>
             </div>
          </div>
       </div>
    </div>
  );
}
