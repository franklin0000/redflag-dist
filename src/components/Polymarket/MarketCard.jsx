import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TradeModal from './TradeModal';

export default function MarketCard({ market, filter }) {
  const navigate = useNavigate();
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState(null); // 'YES' or 'NO'

  // Filter Logic Mocking
  if (filter && filter !== 'All' && market?.category !== filter) {
    const text = (market?.title || "").toLowerCase();
    const isCrypto = text.includes('bitcoin') || text.includes('eth') || text.includes('solana');
    const isSport = text.includes('super bowl') || text.includes('nfl') || text.includes('nba');
    const isSocial = !isCrypto && !isSport;
    
    if (filter === 'Crypto' && !isCrypto) return null;
    if (filter === 'Sport' && !isSport) return null;
    if (filter === 'Social' && !isSocial) return null;
  }

  const title = market?.title || "Will Taylor Swift & Travis Kelce engage in 2026?";
  const yesPrice = market?.yesPrice ?? 0.74;
  const noPrice = market?.noPrice ?? parseFloat((1 - yesPrice).toFixed(4));
  const volume = market?.volume || Math.floor(Math.random() * 500000);
  const image = market?.image || "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop";

  const handleOpenTrade = (side) => {
    setSelectedSide(side);
    setTradeModalOpen(true);
  };

  return (
    <>
      <motion.div 
        whileHover={{ scale: 1.015, translateY: -2 }}
        transition={{ duration: 0.2 }}
        className="bg-[#1b1c20]/60 backdrop-blur-xl border border-white/[0.06] hover:border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between h-[200px] cursor-pointer"
        onClick={() => navigate(`/predictions/${market.id || market.tokenId}`)}
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-1 opacity-80">
              <span className="material-icons text-[14px] text-gray-500">equalizer</span> 
              ${parseFloat(volume).toLocaleString(undefined, {maximumFractionDigits:0})} Vol.
            </div>
            <h3 className="text-[17px] font-semibold text-gray-100 leading-snug line-clamp-3 hover:text-white transition-colors">
              {title}
            </h3>
          </div>
          <div className="w-14 h-14 flex-shrink-0 bg-gray-800 rounded-[14px] border border-white/5 overflow-hidden shadow-inner">
            <img src={image} alt="Market" className="w-full h-full object-cover" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop"}} />
          </div>
        </div>

        {/* Polymarket Signature Distinct YES / NO Action Buttons */}
        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={() => handleOpenTrade('YES')}
             className="flex-1 bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 border border-[#22c55e]/10 hover:border-[#22c55e]/30 py-3 rounded-[12px] font-bold text-xl flex items-center justify-between px-4 transition-all"
           >
             <span className="text-sm font-semibold text-[#22c55e]/80 tracking-wide">Yes</span>
             <span>{Math.round(yesPrice * 100)}<span className="text-sm font-medium">¢</span></span>
           </button>
           
           <button 
             onClick={() => handleOpenTrade('NO')}
             className="flex-1 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 border border-[#ef4444]/10 hover:border-[#ef4444]/30 py-3 rounded-[12px] font-bold text-xl flex items-center justify-between px-4 transition-all"
           >
             <span className="text-sm font-semibold text-[#ef4444]/80 tracking-wide">No</span>
             <span>{Math.round(noPrice * 100)}<span className="text-sm font-medium">¢</span></span>
           </button>
        </div>
      </motion.div>

      {tradeModalOpen && (
        <TradeModal 
          market={{...market, title, image, volume}} 
          yesPrice={yesPrice} 
          noPrice={noPrice} 
          initialSide={selectedSide}
          onClose={() => setTradeModalOpen(false)} 
        />
      )}
    </>
  );
}
