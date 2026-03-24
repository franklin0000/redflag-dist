import { useState, useEffect } from 'react';
import MarketCard from '../components/Polymarket/MarketCard';
import Leaderboard from '../components/Polymarket/Leaderboard';
import RflagBetting from '../components/Polymarket/RflagBetting';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Predictions() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(`${API_BASE}/api/polymarket/markets`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMarkets(data);
        else throw new Error(data.error || 'Failed to load markets');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = markets.filter(m => {
    if (filter === 'social') return /swift|kelce|celeb|date|love|marry|relationship|singer|actor|actress/i.test(m.title);
    if (filter === 'crypto') return /bitcoin|btc|eth|crypto|defi|nft|polygon|matic/i.test(m.title);
    if (filter === 'sport') return /nba|nfl|soccer|sport|game|champion/i.test(m.title);
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 pb-24 px-4 pt-6">
      {/* Header */}
      <div className="max-w-xl mx-auto mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">📈</span>
          <h1 className="text-2xl font-extrabold text-white">Live Predictions</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Trade on real-world outcomes using USDC on Polygon. Powered by{' '}
          <span className="text-pink-400 font-semibold">Polymarket</span>.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="max-w-xl mx-auto flex gap-2 mb-6 flex-wrap">
        {['all', 'social', 'crypto', 'sport'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? '🔥 All Markets' : f === 'social' ? '💃 Social' : f === 'crypto' ? '🪙 Crypto' : '🏆 Sport'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-xl mx-auto">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Loading markets...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-gray-500 text-center py-12">No markets found for this filter.</div>
        )}

        {!loading && !error && filtered.map(market => (
          <MarketCard key={market.id} market={market} />
        ))}

        {/* $RFLAG fallback section */}
        {!loading && (
          <div className="mt-10 border-t border-gray-800 pt-8">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>🚩</span> Bet with $RFLAG
            </h2>
            <p className="text-gray-400 text-xs mb-4">Use your $RFLAG tokens on community-created markets.</p>
            <RflagBetting eventName="Next RedFlag community event" />
          </div>
        )}

        {/* Leaderboard */}
        {!loading && (
          <div className="mt-8">
            <Leaderboard />
          </div>
        )}
      </div>
    </div>
  );
}
