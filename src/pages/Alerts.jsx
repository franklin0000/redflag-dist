import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { secureGet } from '../services/secureStorage';

const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

export default function Alerts() {
    const toast = useToast();
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState('all');
    const [dismissing, setDismissing] = useState(null);
    const [expandedActions, setExpandedActions] = useState(null);
    const [loadingAlerts, setLoadingAlerts] = useState(true);

    const [alerts, setAlerts] = useState([]);

    // 🔒 Load user reports from Supabase and encrypted storage
    useEffect(() => {
        const fetchAllReports = async () => {
            try {
                // Dynamically import to avoid circular dependency if any
                const { reportsService } = await import('../services/reportsService');
                const recentReports = await reportsService.getRecentReports(50);

                // Map real reports to Alerts format needed
                const formattedReports = recentReports.map(item => ({
                    id: item.id,
                    user: item.name ? `Report against ${item.name}` : 'Community Member',
                    isNew: true,
                    timestamp: new Date(item.created_at || new Date()).getTime(),
                    image: item.image || item.thumbnail || null, // Ensure image is passed correctly
                    flags: item.type ? [item.type] : ['Under Review'],
                    description: item.description || item.details || 'No details provided.',
                    initials: item.name ? item.name.substring(0, 2).toUpperCase() : '??',
                    riskLevel: item.severity || 'medium',
                    location: item.location || 'Unknown',
                }));

                // Fetch search history just in case there are offline local-only reports
                const storedHistory = await secureGet('search_history');
                const history = storedHistory || [];
                const localHistoryReports = history
                    .filter(item => item.type === 'report' && !formattedReports.find(fr => fr.id === item.id))
                    .map(item => ({
                        id: item.id,
                        user: 'Community Member',
                        isNew: true,
                        timestamp: new Date(item.date).getTime(),
                        image: item.thumbnail,
                        flags: item.selectedFlags || ['Under Review'],
                        description: `${item.query} - ${item.details || 'No details provided.'}`,
                        initials: item.query ? item.query.substring(0, 2).toUpperCase() : '??',
                        riskLevel: 'medium',
                        location: 'Unknown',
                    }));

                setAlerts([...formattedReports, ...localHistoryReports].sort((a, b) => b.timestamp - a.timestamp));
            } catch (err) {
                console.error("Failed to fetch reports for Alerts:", err);
            } finally {
                setLoadingAlerts(false);
            }
        };
        fetchAllReports();
    }, []);

    const handleDismiss = (id) => {
        setDismissing(id);
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== id));
            setDismissing(null);
            toast.success('Alert archived');
        }, 300);
    };

    const handleBlock = (alert) => {
        toast.success(`${alert.initials} blocked successfully`);
        setExpandedActions(null);
    };

    const handleShare = (alert) => {
        if (navigator.share) {
            navigator.share({ title: `RedFlag Alert: ${alert.flags[0]}`, text: alert.description });
        } else {
            navigator.clipboard.writeText(alert.description);
            toast.success('Alert copied to clipboard');
        }
        setExpandedActions(null);
    };

    const handleReport = () => {
        toast.success('Report forwarded to authorities');
        setExpandedActions(null);
    };

    const filteredAlerts = alerts.filter(a => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'high') return a.riskLevel === 'high';
        if (activeFilter === 'nearby') return true; // Simulated
        return true;
    });

    const filters = [
        { key: 'all', label: 'All Alerts', icon: null },
        { key: 'nearby', label: '📍 Nearby', icon: null },
        { key: 'high', label: '🚩 High Risk', icon: null },
    ];

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-display min-h-screen flex flex-col antialiased">
            {/* Top Safety Warning Banner */}
            <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs font-medium text-primary sticky top-0 z-40 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-sm">info</span>
                    <span>Reports are community generated. Verify independently.</span>
                </div>
                <button className="text-primary hover:text-white transition-colors">
                    <span className="material-icons text-sm">close</span>
                </button>
            </div>

            {/* Sticky Header */}
            <header className="sticky top-[33px] z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg border-b border-gray-200 dark:border-white/5 pt-4 pb-2 px-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Recent Alerts</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{alerts.length} alerts</span>
                        <button className="relative p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                            <span className="material-icons text-xl text-gray-600 dark:text-gray-300">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-background-light dark:ring-background-dark"></span>
                        </button>
                    </div>
                </div>
                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeFilter === f.key
                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary/30'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Feed Content */}
            <main className="flex-1 px-4 py-4 space-y-4 pb-24">
                {loadingAlerts ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm text-gray-400">Cargando alertas...</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 animate-float">
                            <span className="material-icons text-4xl text-gray-300 dark:text-gray-600">notifications_off</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">No alerts found</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {activeFilter !== 'all' ? 'Try a different filter.' : 'All clear! No alerts right now.'}
                        </p>
                        {activeFilter !== 'all' && (
                            <button
                                onClick={() => setActiveFilter('all')}
                                className="mt-4 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium shadow-lg shadow-primary/20"
                            >
                                Show All Alerts
                            </button>
                        )}
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <article
                            key={alert.id}
                            onClick={() => navigate(`/report/${alert.id}`)}
                            className={`bg-white dark:bg-[#2d1b2a] rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 relative transition-all duration-300 cursor-pointer hover:border-primary/20 ${dismissing === alert.id ? 'animate-slide-out' : ''
                                }`}
                        >
                            {/* Card Header */}
                            <div className="p-4 flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center text-white font-bold text-sm">
                                        {alert.initials}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{alert.user}</span>
                                            {alert.isNew && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wide">New</span>
                                            )}
                                            {alert.riskLevel === 'high' && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 uppercase tracking-wide">High Risk</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Posted {getTimeAgo(alert.timestamp)}</p>
                                            {alert.location && (
                                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                                    <span className="material-icons text-[10px]">location_on</span>
                                                    {alert.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setExpandedActions(expandedActions === alert.id ? null : alert.id)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                >
                                    <span className="material-icons">more_horiz</span>
                                </button>
                            </div>

                            {/* Actions Dropdown */}
                            {expandedActions === alert.id && (
                                <div className="px-4 pb-3 flex gap-2 animate-page-in">
                                    <button
                                        onClick={() => handleBlock(alert)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                                    >
                                        <span className="material-icons text-sm">block</span>
                                        Block User
                                    </button>
                                    <button
                                        onClick={() => handleShare(alert)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
                                    >
                                        <span className="material-icons text-sm">share</span>
                                        Share
                                    </button>
                                    <button
                                        onClick={() => handleReport(alert)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors"
                                    >
                                        <span className="material-icons text-sm">gavel</span>
                                        Report
                                    </button>
                                </div>
                            )}

                            {/* Blurred Visual Area */}
                            <div className="relative w-full h-64 bg-gray-900 overflow-hidden mx-auto">
                                <img alt="Blurred person" className="w-full h-full object-cover opacity-60 blur-xl scale-110" src={alert.image || 'https://placehold.co/400x300'} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                    <div className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 mb-2">
                                        <span className="material-icons text-white text-2xl">visibility_off</span>
                                    </div>
                                    <span className="text-xs font-medium text-white/80 uppercase tracking-widest">Identity Protected</span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {alert.flags.map((flag, idx) => (
                                        <span key={idx} className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${idx % 2 === 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                                            {flag}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                                    {alert.description}
                                </p>

                                {/* Action Bar */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => handleDismiss(alert.id)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-primary/5"
                                    >
                                        <span className="material-icons text-sm">archive</span>
                                        Archive
                                    </button>
                                    <div className="flex gap-3">
                                        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                                            <span className="material-icons text-sm">chat_bubble_outline</span>
                                            <span>Comments</span>
                                        </button>
                                        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                                            <span className="material-icons text-sm">thumb_up_off_alt</span>
                                            <span>Helpful</span>
                                        </button>
                                        <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                                            <span className="material-icons text-sm">bookmark_border</span>
                                            <span>Save</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </main>

            {/* Floating Action Button */}
            <button className="fixed bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group">
                <span className="material-icons text-2xl group-hover:rotate-90 transition-transform duration-300">add</span>
            </button>
        </div>
    );
}
