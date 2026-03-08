
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { secureGet, secureRemove } from '../services/secureStorage';

export default function ReportsHistory() {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);

    // 🔒 Load history from encrypted storage
    useEffect(() => {
        secureGet('search_history').then(stored => {
            if (stored) setHistory(stored);
        });
    }, []);

    const clearHistory = () => {
        if (window.confirm('Are you sure you want to clear your search history?')) {
            secureRemove('search_history');
            setHistory([]);
        }
    };

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleItemClick = (item) => {
        navigate('/results', {
            state: {
                results: item.results,
                sourceImage: item.thumbnail,
                query: item.query,
                searchType: item.type === 'image' ? undefined : item.type
            }
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-gray-100 min-h-screen pb-24 max-w-md mx-auto relative shadow-2xl border-x border-gray-200 dark:border-white/5">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Reports History</h1>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-400 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        Clear All
                    </button>
                )}
            </header>

            <main className="p-4 space-y-4">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <span className="material-icons text-3xl text-gray-400">history</span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No reports yet</h3>
                        <p className="text-sm text-gray-500 mb-6">Your recent facial scans and background checks will appear here.</p>
                        <button onClick={() => navigate('/')} className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow hover:bg-primary/90 transition-colors">
                            Start New Scan
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="bg-white dark:bg-[#1a202c] rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]"
                            >
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                    {item.type === 'image' && item.thumbnail ? (
                                        <img src={item.thumbnail} alt="Scan" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons text-gray-400 text-2xl">
                                            {item.type === 'phone' ? 'phone_iphone' : item.type === 'handle' ? 'alternate_email' : 'badge'}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-grow min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {item.type === 'image' ? 'Facial Scan Analysis' : item.query}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{formatDate(item.date)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mb-1.5">
                                        {item.type === 'report' ? 'Community Report' : `${item.type} Search`}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {item.type === 'report' ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                                Submitted
                                            </span>
                                        ) : (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${item.matchCount > 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                                                {item.matchCount} Matches Found
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="material-icons text-gray-300 text-lg">chevron_right</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
