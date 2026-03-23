import React, { useState } from 'react';

export default function RflagBetting({ eventName }) {
  const [betAmount, setBetAmount] = useState(10);
  const [prediction, setPrediction] = useState('YES');

  const handleBet = () => {
     alert(`Simulated Internal Bet placed: ${betAmount} $RFLAG on ${prediction} for event: ${eventName || 'Dating Event'}`);
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 border border-purple-500/30 rounded-xl mt-4 shadow-xl relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

      <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
        <span className="text-purple-400">⚡</span> Internal $RFLAG Betting
      </h3>
      <p className="text-gray-400 text-xs mb-5">
        Polymarket markets are currently unavailable for this couple. You can use your $RFLAG tokens to place an internal prediction instead.
      </p>
      
      <div className="flex gap-3 mb-5">
        <button 
          className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all shadow-md ${prediction === 'YES' ? 'bg-purple-600 text-white shadow-purple-500/50 scale-105' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`} 
          onClick={() => setPrediction('YES')}
        >
          YES
        </button>
        <button 
          className={`flex-1 py-3 rounded-xl font-extrabold text-sm transition-all shadow-md ${prediction === 'NO' ? 'bg-gray-600 text-white shadow-gray-500/50 scale-105' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`} 
          onClick={() => setPrediction('NO')}
        >
          NO
        </button>
      </div>
      
      <div className="mb-5">
        <label className="text-xs text-gray-400 mb-1 block uppercase font-bold tracking-wider">Stake Amount ($RFLAG)</label>
        <div className="relative">
          <input 
            type="number" 
            value={betAmount} 
            onChange={e => setBetAmount(e.target.value)} 
            className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 p-3 pl-10 text-white rounded-xl outline-none font-bold text-lg" 
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500 font-bold">🚩</span>
        </div>
      </div>

      <button onClick={handleBet} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all text-sm uppercase tracking-wide">
        Place $RFLAG Prediction
      </button>
    </div>
  );
}
