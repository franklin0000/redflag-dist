import React, { useState } from 'react';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([
     { name: "CryptoWhale", trades: 142, volume: "$54k", returns: "+12%" },
     { name: "DaterPro", trades: 89, volume: "$21k", returns: "+8%" },
     { name: "AnonBet", trades: 34, volume: "$9k", returns: "-2%" }
  ]);

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 mt-6 shadow-lg">
       <h3 className="text-xl font-bold text-white mb-4">🏆 Top Prediction Traders</h3>
       <div className="space-y-3">
         {leaders.map((l, i) => (
           <div key={i} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800 hover:border-pink-500/50 transition-colors">
             <div className="flex items-center gap-3">
               <span className={`font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`}>#{i+1}</span>
               <span className="text-white font-bold">{l.name}</span>
             </div>
             <div className="text-right">
               <div className="text-sm font-semibold text-gray-300">Vol: {l.volume}</div>
               <div className={`text-xs ${l.returns.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                 P&L: {l.returns}
               </div>
             </div>
           </div>
         ))}
       </div>
    </div>
  )
}
