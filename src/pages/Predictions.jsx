import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MarketCard from '../components/Polymarket/MarketCard';

const HeroMarket = ({ market }) => {
  const navigate = useNavigate();
  if (!market) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onClick={() => navigate(`/predictions/${market.id || market.tokenId}`)}
      className="relative w-full h-[400px] rounded-[40px] overflow-hidden cursor-pointer group mb-12 shadow-2xl border border-white/10"
    >
      <img src={market.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 p-10 w-full md:w-2/3">
         <div className="flex gap-2 mb-4">
            <span className="bg-pink-600 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-lg shadow-pink-600/20">Featured</span>
            <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">Politics</span>
         </div>
         <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight text-white drop-shadow-2xl">
           {market.title}
         </h2>
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="text-pink-500 font-black text-2xl">{Math.round(market.yesPrice * 100)}¢</span>
               <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">Yes Chance</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-gray-300">
               <span className="font-black text-lg">${parseFloat(market.volume).toLocaleString()}</span>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">24h Volume</p>
            </div>
         </div>
      </div>
      
      <div className="absolute top-10 right-10 hidden md:block">
         <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center backdrop-blur-3xl group-hover:border-pink-500 transition-colors">
            <span className="material-icons text-white group-hover:text-pink-500 transition-colors text-3xl">trending_up</span>
         </div>
      </div>
    </motion.div>
  );
};

export default function Predictions() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const url = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL}/api/polymarket/markets` 
          : 'http://localhost:3001/api/polymarket/markets';
        const res = await fetch(url);
        const data = await res.json();
        setMarkets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch markets', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  const FILTERS = [
    { id: 'All', icon: '🔥', label: 'Top Markets' },
    { id: 'Social', icon: '💃', label: 'Social' },
    { id: 'Crypto', icon: '🪙', label: 'Crypto' },
    { id: 'Sport', icon: '🏆', label: 'Sports' }
  ];

  const filteredMarkets = markets.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(debouncedSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    // Case-insensitive category match first
    if (m.category?.toLowerCase() === filter.toLowerCase()) return true;
    // Keyword-based fallback matching
    const text = (m.title || '').toLowerCase();
    if (filter === 'Crypto') return text.includes('bitcoin') || text.includes('btc') || text.includes('eth') || text.includes('solana') || text.includes('crypto') || text.includes('token');
    if (filter === 'Sport') return text.includes('super bowl') || text.includes('nfl') || text.includes('nba') || text.includes('champions') || text.includes('world cup') || text.includes('soccer') || text.includes('baseball') || text.includes('tennis');
    if (filter === 'Social') return !text.includes('bitcoin') && !text.includes('btc') && !text.includes('nfl') && !text.includes('nba');
    return false;
  });

  const heroMarket = markets[0];
  const sideMarkets = markets.slice(1, 5);

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white pb-24 relative overflow-hidden">
       {/* Ambient Subtle Gradients */}
       <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ec4899]/5 blur-[200px] pointer-events-none" />
       <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2563eb]/5 blur-[200px] pointer-events-none" />
       
       <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10">
          
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
             <div className="space-y-4 w-full md:w-auto">
                <h1 className="text-5xl font-black tracking-tight">Predictions</h1>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 md:pb-0">
                    {FILTERS.map(f => (
                      <button 
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs transition-all duration-300 border uppercase tracking-widest ${
                          filter === f.id 
                            ? 'bg-white text-black shadow-2xl shadow-white/10 border-white' 
                            : 'bg-[#1b1c20]/50 text-gray-400 hover:bg-[#25262b] border-white/5 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <div className="h-8 w-px bg-white/10 hidden md:block" />
                  <button onClick={() => navigate('/portfolio')} className="text-pink-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-pink-500/10 px-4 py-2 rounded-xl transition-all">
                    <span className="material-icons text-sm">wallet</span> Portfolio
                  </button>
                </div>
             </div>

             <div className="relative w-full md:w-96 group">
                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors">search</span>
                <input 
                  type="text"
                  placeholder="Search events, tokens, categories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1b1c20]/80 backdrop-blur-xl border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all text-sm font-medium"
                />
             </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
             {/* Main Catalog Column */}
             <div className="xl:col-span-3">
                {search === '' && filter === 'All' && !loading && (
                   <HeroMarket market={heroMarket} />
                )}

                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-black border-l-4 border-pink-500 pl-4">Discover Markets</h3>
                   <div className="flex gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      <span>Recent</span>
                      <span className="text-pink-500">•</span>
                      <span>Volatile</span>
                   </div>
                </div>

                {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {[1,2,3,4].map(i => <div key={i} className="h-48 bg-[#1b1c20] rounded-3xl animate-pulse" />)}
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <AnimatePresence mode="popLayout">
                        {filteredMarkets.map((m, idx) => (
                           <motion.div
                             layout
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             key={m.id || idx}
                           >
                             <MarketCard market={m} filter={filter} />
                           </motion.div>
                        ))}
                      </AnimatePresence>
                   </div>
                )}
             </div>

             {/* Right Sidebar */}
             <div className="hidden xl:block space-y-12">
                <div className="bg-[#15161a] border border-white/5 rounded-[32px] p-8 shadow-xl">
                   <h4 className="font-black text-lg mb-6 flex items-center gap-2">
                     <span className="material-icons text-pink-500">local_fire_department</span> Trending
                   </h4>
                   <div className="space-y-6">
                      {sideMarkets.map((m, i) => (
                        <div 
                          key={i} 
                          onClick={() => navigate(`/predictions/${m.id}`)}
                          className="group cursor-pointer flex gap-4 items-center"
                        >
                           <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black group-hover:bg-pink-500 transition-all duration-300">
                              #{i + 1}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate group-hover:text-pink-500 transition-colors leading-tight">{m.title}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-tighter">{Math.round(m.yesPrice * 100)}% YES</p>
                           </div>
                        </div>
                      ))}
                   </div>
                   <button className="w-full mt-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-all">View Leaderboard</button>
                </div>

                <div className="bg-gradient-to-br from-[#1a1532] to-[#0e0e11] border border-white/5 rounded-[32px] p-8 shadow-xl">
                   <h4 className="font-black text-lg mb-4">News Flash</h4>
                   <p className="text-gray-400 text-xs mb-6">Markets are shifting rapidly after the latest debate results. Volatility up 24%.</p>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                      <div className="h-full w-2/3 bg-pink-500" />
                   </div>
                   <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Sentiment Index: Bullish</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}
