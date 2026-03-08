import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    subscribeToNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from '../services/notificationService';

const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
};

const groupByTime = (notifications) => {
    const now = Date.now();
    const today = [];
    const earlier = [];
    const thisWeek = [];

    notifications.forEach((n) => {
        const hoursAgo = (now - n.time) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
            // Split 'today' vs 'earlier' purely by strict 24h window or typical "today" logic?
            // The mock logic used < 6 for today. Let's stick to that for consistency.
            if (hoursAgo < 6) today.push(n);
            else earlier.push(n);
        } else {
            thisWeek.push(n);
        }
    });

    return { today, earlier, thisWeek };
};

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [dismissing, setDismissing] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const touchStartX = useRef(0);

    // Subscribe to notifications
    useEffect(() => {
        if (!user) {
            // If we are still loading, validly turn it off now that we know we have no user
            if (loading) {
                const timer = setTimeout(() => setLoading(false), 0);
                return () => clearTimeout(timer);
            }
            return;
        }

        const unsubscribe = subscribeToNotifications(user.id, (data) => {
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, loading]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkAllRead = async () => {
        if (!user) return;
        await markAllNotificationsRead(user.id);
        toast.success('All notifications marked as read');
    };

    const handleDismiss = async (id) => {
        setDismissing(id);
        // Optimistic UI update or wait? Firestore is fast, but animation needs time.
        // We'll wait for animation then delete. 
        setTimeout(async () => {
            await deleteNotification(id);
            setDismissing(null);
            toast.success('Notification dismissed');
        }, 300);
    };

    const handleTap = async (notification) => {
        // Mark as read on tap if unread
        if (!notification.read) {
            await markNotificationRead(notification.id);
        }
        // Toggle expanded state to reveal action button
        setExpandedId(expandedId === notification.id ? null : notification.id);
    };

    const handleAction = async (notification) => {
        // Mark as read if not already
        if (!notification.read) {
            await markNotificationRead(notification.id);
        }

        // Navigate based on actionTarget or custom logic
        if (notification.actionTarget) {
            navigate(notification.actionTarget);
        } else {
            // Fallback for types
            switch (notification.type) {
                case 'safety': navigate('/alerts'); break;
                case 'match': navigate('/dating/matches'); break;
                case 'report': navigate('/reports'); break;
                case 'system': navigate('/profile'); break;
                default: break;
            }
        }
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e, id) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 80) handleDismiss(id);
    };

    const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);
    const groups = groupByTime(filtered);

    const filters = [
        { key: 'all', label: 'All', icon: 'notifications' },
        { key: 'safety', label: 'Safety', icon: 'shield' },
        { key: 'match', label: 'Matches', icon: 'favorite' },
        { key: 'report', label: 'Reports', icon: 'flag' },
        { key: 'system', label: 'System', icon: 'settings' },
    ];

    const renderSection = (title, items) => {
        if (!items.length) return null;
        return (
            <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-5 mb-2">{title}</h3>
                <div className="space-y-0.5">
                    {items.map((n) => (
                        <div key={n.id}>
                            <div
                                onClick={() => handleTap(n)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={(e) => handleTouchEnd(e, n.id)}
                                className={`
                                    relative px-5 py-3.5 flex items-start gap-3 cursor-pointer select-none
                                    transition-all duration-300 ease-out active:bg-gray-100 dark:active:bg-white/10
                                    ${!n.read ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                                    ${dismissing === n.id ? 'translate-x-full opacity-0 h-0 py-0 overflow-hidden' : ''}
                                `}
                            >
                                {/* Unread indicator */}
                                {!n.read && (
                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                )}

                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl ${n.iconBg || 'bg-gray-500/10'} flex items-center justify-center flex-shrink-0 transition-transform ${expandedId === n.id ? 'scale-110' : ''}`}>
                                    <span className={`material-icons text-lg ${n.iconColor || 'text-gray-500'}`}>{n.icon || 'notifications'}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <span className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {n.title}
                                        </span>
                                        <span className="text-[11px] text-gray-400 flex-shrink-0">{getTimeAgo(n.time)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{n.message}</p>
                                </div>

                                {/* Dismiss / Chevron */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                                    className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-all self-center opacity-40 hover:opacity-100"
                                >
                                    <span className="material-icons text-sm text-gray-400">close</span>
                                </button>
                            </div>

                            {/* Expanded action area — unique per notification */}
                            {expandedId === n.id && (
                                <div className="px-5 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 animate-page-in">
                                    {n.type !== 'system' && ( // Don't show action button for simple system msg unless it has target
                                        <button
                                            onClick={() => handleAction(n)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                                        >
                                            <span className="material-icons text-sm">{n.actionIcon || 'arrow_forward'}</span>
                                            {n.actionLabel || 'View Details'}
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDismiss(n.id); }}
                                        className="px-4 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-white/15 active:scale-95 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen font-display text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center justify-between px-5 py-4">
                    <button onClick={() => navigate(-1)} className="p-1.5 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                        <span className="material-icons">chevron_left</span>
                    </button>
                    <h1 className="text-lg font-bold">Notifications</h1>
                    <button
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        className="text-xs font-medium text-primary hover:text-primary/80 disabled:text-gray-400 disabled:cursor-default transition-colors"
                    >
                        Mark all read
                    </button>
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-3">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`
                                flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                                ${filter === f.key
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-primary/30'
                                }
                            `}
                        >
                            <span className="material-icons text-[14px]">{f.icon}</span>
                            {f.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Unread summary */}
            {unreadCount > 0 && (
                <div className="px-5 py-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white">{unreadCount}</span>
                        </div>
                        <span className="text-sm font-medium text-primary">unread notification{unreadCount > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 italic">Tap to interact • Swipe to dismiss</span>
                </div>
            )}

            {/* Notification list */}
            <main className="pb-24 pt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-sm">Loading notifications...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 animate-float">
                            <span className="material-icons text-4xl text-gray-300 dark:text-gray-600">notifications_off</span>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">All caught up!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">No notifications to show right now.</p>
                        {filter !== 'all' && (
                            <button
                                onClick={() => setFilter('all')}
                                className="mt-4 px-5 py-2 bg-primary text-white rounded-full text-sm font-medium shadow-lg shadow-primary/20"
                            >
                                Show All
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {renderSection('Today', groups.today)}
                        {renderSection('Earlier', groups.earlier)}
                        {renderSection('This Week', groups.thisWeek)}
                    </>
                )}
            </main>
        </div>
    );
}

