import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import TradeModal from '../components/Polymarket/TradeModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [timeframe, setTimeframe] = useState('1d');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState('YES');

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Use the single-market endpoint
        const res = await fetch(`${API_BASE}/api/polymarket/markets/${id}`);
        const found = await res.json();
        if (found.error) throw new Error(found.error);
        setMarket(found);

        if (found.tokenId) {
           // Fetch History — returns { history: [{t, p}, ...] }
           const histRes = await fetch(`${API_BASE}/api/polymarket/history?tokenId=${found.tokenId}&interval=${timeframe}`);
           const histData = await histRes.json();
           setHistory(histData?.history || []);

           // Fetch Order Book
           const bookRes = await fetch(`${API_BASE}/api/polymarket/orderbook?tokenId=${found.tokenId}`);
           const bookData = await bookRes.json();
           setOrderBook(bookData || { bids: [], asks: [] });
        }
      } catch (err) {
        console.error("Error fetching market data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarketData();
  }, [id, timeframe]);

  if (loading && !market) return (
    <div className="min-h-screen bg-[#0e0e11] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!market) return (
    <div className="min-h-screen bg-[#0e0e11] text-white flex flex-col items-center justify-center p-6">
      <h2 className="text-2xl font-bold mb-4">Market not found</h2>
      <button onClick={() => navigate('/predictions')} className="bg-pink-600 px-6 py-2 rounded-lg text-white font-bold">Back to Markets</button>
    </div>
  );

  const chartData = {
    labels: history.map(h => new Date(h.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        fill: true,
        label: 'Probability',
        data: history.map(h => h.p),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1b1c20',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `${(context.raw * 100).toFixed(1)}% Chance`
        }
      }
    },
    scales: {
      x: { 
        display: true,
        grid: { display: false },
        ticks: { color: '#4b5563', font: { size: 10 }, maxRotation: 0 }
      },
      y: { 
        min: 0, 
        max: 1, 
        ticks: { 
          callback: (value) => `${Math.round(value * 100)}%`,
          color: '#4b5563',
          font: { size: 10 }
        },
        grid: { color: 'rgba(255,255,255,0.03)' }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0e11] text-white pb-24">
      <div className="max-w-7xl mx-auto p-6 md:p-10">
        <button onClick={() => navigate('/predictions')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <span className="material-icons text-sm">arrow_back</span> Back to Markets
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-start gap-6">
              <img src={market.image} className="w-20 h-20 rounded-2xl object-cover border border-white/10" alt="" />
              <div>
                <h1 className="text-3xl font-bold leading-tight mb-2">{market.title}</h1>
                <div className="flex gap-4 text-sm">
                  <span className="text-pink-500 font-bold flex items-center gap-1">
                    <span className="material-icons text-xs">trending_up</span> 
                    {Math.round(market.yesPrice * 100)}% Chance
                  </span>
                  <span className="text-gray-500 font-medium">${parseFloat(market.volume).toLocaleString()} Vol.</span>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-[#15161a] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold text-gray-300">Probability History</h2>
                 <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                    {['1h', '6h', '1d', '7d'].map(tf => (
                      <button 
                        key={tf} 
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase ${timeframe === tf ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-white'}`}
                      >
                        {tf}
                      </button>
                    ))}
                 </div>
               </div>
               <div className="h-[350px] w-full">
                  {history.length > 0 ? (
                    <Line data={chartData} options={chartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-600">No history data available</div>
                  )}
               </div>
            </div>

            {/* Tabs / Info */}
            <div className="space-y-8">
               <div className="flex gap-10 border-b border-white/5">
                  <div className="relative">
                    <button className="pb-4 font-black text-xs uppercase tracking-widest text-pink-500">Overview</button>
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-pink-500 rounded-full" />
                  </div>
                  <button className="pb-4 font-black text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Order Book</button>
                  <button className="pb-4 font-black text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Activity</button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                     <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Description</h4>
                     <p className="text-gray-400 leading-relaxed text-sm">
                        {market.description}
                     </p>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-sm font-black uppercase tracking-widest text-gray-400">Live Order Book</h4>
                     <div className="space-y-1">
                        {(orderBook.bids || []).slice(0, 5).map((bid, i) => {
                          const p = parseFloat(bid.price); const s = parseFloat(bid.size_amount || bid.size || 0);
                          return (
                          <div key={i} className="flex justify-between items-center text-[11px]">
                             <div className="flex items-center gap-2 flex-1">
                                <div className="h-4 bg-green-500/10 rounded overflow-hidden flex-1 max-w-[100px]">
                                   <div className="h-full bg-green-500/30" style={{ width: `${Math.min(100, (s / 1000) * 100)}%` }} />
                                </div>
                                <span className="text-green-500 font-bold w-12">{(p * 100).toFixed(1)}¢</span>
                             </div>
                             <span className="text-gray-500 font-mono">{s.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                          </div>
                        )})}
                        <div className="h-px bg-white/5 my-2" />
                        {(orderBook.asks || []).slice(0, 5).map((ask, i) => {
                          const p = parseFloat(ask.price); const s = parseFloat(ask.size_amount || ask.size || 0);
                          return (
                          <div key={i} className="flex justify-between items-center text-[11px]">
                             <div className="flex items-center gap-2 flex-1">
                                <div className="h-4 bg-red-500/10 rounded overflow-hidden flex-1 max-w-[100px]">
                                   <div className="h-full bg-red-500/30" style={{ width: `${Math.min(100, (s / 1000) * 100)}%` }} />
                                </div>
                                <span className="text-red-500 font-bold w-12">{(p * 100).toFixed(1)}¢</span>
                             </div>
                             <span className="text-gray-500 font-mono">{s.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                          </div>
                        )})}

                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Sidebar - Quick Trade Area */}
          <div className="lg:col-span-1">
             <div className="sticky top-28 bg-[#15161a] border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6">
                <h3 className="text-xl font-bold">Place your bet</h3>
                
                <div className="bg-black/20 rounded-2xl p-2 flex gap-2">
                   <button 
                     onClick={() => setSelectedSide('YES')}
                     className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedSide === 'YES' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                   >
                     YES {Math.round(market.yesPrice * 100)}¢
                   </button>
                   <button 
                     onClick={() => setSelectedSide('NO')}
                     className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedSide === 'NO' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                   >
                     NO {Math.round(market.noPrice * 100)}¢
                   </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                   <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Predicted Outcome</span>
                      <span className={`${selectedSide === 'YES' ? 'text-green-500' : 'text-red-500'} font-bold`}>{selectedSide}</span>
                   </div>
                   <button 
                     onClick={() => setTradeModalOpen(true)}
                     className={`w-full py-4 rounded-2xl font-black text-lg transition-all transform active:scale-95 shadow-xl ${selectedSide === 'YES' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                   >
                     Bet {selectedSide}
                   </button>
                   <p className="text-[10px] text-gray-600 text-center uppercase tracking-widest font-bold">
                     SECURE PROXY EXECUTION • 1.5% FEE
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {tradeModalOpen && (
          <TradeModal 
            market={market} 
            yesPrice={market.yesPrice} 
            noPrice={market.noPrice} 
            initialSide={selectedSide}
            onClose={() => setTradeModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
