/**
 * GuardianDashboard — public page (no auth required).
 * Accessed via /guardian/:token
 * The trusted person sees the dater's live location, sentiment, and SOS status.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionByToken, subscribeToSession } from '../services/guardianService';
import { getGoogleMapsLink } from '../services/locationService';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(isoString) {
    if (!isoString) return 'Never';
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    if (diff < 15) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

function elapsed(isoString) {
    if (!isoString) return '—';
    const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── Sentiment config ─────────────────────────────────────────────────────────
const SENTIMENT = {
    normal: { label: 'Safe', color: 'green', icon: 'check_circle', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
    tense:  { label: 'Check-in Overdue', color: 'yellow', icon: 'warning', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-400' },
    alert:  { label: 'EMERGENCY', color: 'red', icon: 'sos', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
};

export default function GuardianDashboard() {
    const { token } = useParams();

    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [, setTick] = useState(0); // forces re-render for timeAgo

    // Refresh timeAgo labels every 15s
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 15_000);
        return () => clearInterval(id);
    }, []);

    // ── Load session by token ────────────────────────────────────────────────
    const loadSession = useCallback(async () => {
        try {
            const sess = await getSessionByToken(token);
            setSession(sess);
        } catch {
            setError('Session not found or has ended. Make sure you have the right link.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadSession(); }, [loadSession]);

    // ── Realtime subscription ────────────────────────────────────────────────
    useEffect(() => {
        if (!session?.id) return;
        const channel = subscribeToSession(session.id, (updated) => {
            setSession(prev => ({ ...prev, ...updated }));
        });
        return () => { channel.unsubscribe(); };
    }, [session?.id]);

    // ── Computed values ──────────────────────────────────────────────────────
    const sentiment = session ? (SENTIMENT[session.sentiment] || SENTIMENT.normal) : null;
    const isSOS = session?.is_sos;
    const mapsUrl = session?.location
        ? getGoogleMapsLink(session.location.lat, session.location.lng)
        : null;
    const locationAge = session?.location?.updatedAt || session?.last_checkin_at;
    const sinceCheckin = session?.last_checkin_at;
    const minutesSinceCheckin = sinceCheckin
        ? Math.floor((Date.now() - new Date(sinceCheckin)) / 60000)
        : null;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Loading guardian session...</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14] flex flex-col items-center justify-center gap-5 p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                    <span className="material-icons text-gray-400 text-4xl">link_off</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Not Found</h2>
                    <p className="text-gray-500 text-sm mt-2">{error}</p>
                </div>
                <div className="bg-gray-100 dark:bg-white/5 rounded-2xl p-4 text-left text-sm text-gray-500 space-y-1 max-w-sm w-full">
                    <p>• The session may have ended</p>
                    <p>• The link may be incorrect or expired</p>
                    <p>• Ask your contact to share the link again</p>
                </div>
            </div>
        );
    }

    // ── SOS Full-screen overlay ──────────────────────────────────────────────
    if (isSOS) {
        return (
            <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-8 text-center text-white space-y-6">
                <span className="material-icons text-8xl animate-bounce">sos</span>
                <div>
                    <h1 className="text-4xl font-black">EMERGENCY</h1>
                    <p className="text-xl font-bold mt-1">{session.dater_name} needs help!</p>
                    <p className="text-red-200 text-sm mt-2">SOS was triggered at {new Date(session.last_checkin_at).toLocaleTimeString()}</p>
                </div>

                {mapsUrl && (
                    <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-sm py-4 bg-white text-red-600 font-black text-lg rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                        <span className="material-icons">map</span>
                        Open Their Location
                    </a>
                )}

                <div className="bg-white/20 rounded-2xl p-4 w-full max-w-sm text-left space-y-2">
                    <p className="font-bold text-sm">What to do:</p>
                    <p className="text-sm text-red-100">1. Try calling {session.dater_name} immediately</p>
                    <p className="text-sm text-red-100">2. If no answer, go to their location</p>
                    <p className="text-sm text-red-100">3. Call emergency services if needed</p>
                </div>

                <p className="text-red-200 text-xs">This page will update automatically when they mark themselves safe.</p>
            </div>
        );
    }

    // ── Active dashboard ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d14] font-display text-gray-900 dark:text-gray-100">
            {/* Header */}
            <header className="bg-white dark:bg-[#1a202c] border-b border-gray-200 dark:border-white/5 px-5 py-4">
                <div className="flex items-center gap-3 max-w-lg mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="material-icons text-primary text-2xl">shield</span>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Guardian Mode</p>
                        <h1 className="text-lg font-bold">Watching {session.dater_name}</h1>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${sentiment.dot}`} />
                        <span className={`text-xs font-semibold ${sentiment.text}`}>{sentiment.label}</span>
                    </div>
                </div>
            </header>

            <main className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-16">

                {/* Status Card */}
                <div className={`rounded-2xl border p-5 ${sentiment.bg} ${sentiment.border}`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${sentiment.bg} border ${sentiment.border} flex items-center justify-center`}>
                            <span className={`material-icons text-3xl ${sentiment.text}`}>{sentiment.icon}</span>
                        </div>
                        <div className="flex-1">
                            <p className={`text-lg font-bold ${sentiment.text}`}>{sentiment.label}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Date started {elapsed(session.started_at)} ago
                            </p>
                        </div>
                    </div>

                    {minutesSinceCheckin !== null && minutesSinceCheckin >= session.check_in_minutes && (
                        <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                                ⚠️ {session.dater_name} hasn't checked in for {minutesSinceCheckin} min
                                {minutesSinceCheckin > session.check_in_minutes && ` (interval: ${session.check_in_minutes} min)`}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Try contacting them directly.</p>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="bg-white dark:bg-[#1a202c] rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="px-5 py-3.5 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Session started</span>
                        <span className="text-sm font-semibold">{new Date(session.started_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Last check-in</span>
                        <span className="text-sm font-semibold">{timeAgo(session.last_checkin_at)}</span>
                    </div>
                    <div className="px-5 py-3.5 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Location updated</span>
                        <span className="text-sm font-semibold">{timeAgo(locationAge)}</span>
                    </div>
                    {session.date_location && (
                        <div className="px-5 py-3.5 flex justify-between items-center">
                            <span className="text-sm text-gray-500">Venue</span>
                            <span className="text-sm font-semibold truncate max-w-[180px]">📍 {session.date_location}</span>
                        </div>
                    )}
                </div>

                {/* Location */}
                <div className="bg-white dark:bg-[#1a202c] rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Last Known Location</p>
                    {mapsUrl ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                GPS coordinates received {timeAgo(locationAge)}
                            </div>
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm"
                            >
                                <span className="material-icons text-base">map</span>
                                Open in Google Maps
                            </a>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="material-icons text-base">location_off</span>
                            Waiting for first GPS update…
                        </div>
                    )}
                </div>

                {/* If no updates for long time */}
                {minutesSinceCheckin !== null && minutesSinceCheckin > session.check_in_minutes * 2 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-3">
                        <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                            ⚠️ No check-in for over {minutesSinceCheckin} minutes
                        </p>
                        <p className="text-sm text-gray-500">If you can't reach them, consider contacting emergency services.</p>
                        <a
                            href="tel:911"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm"
                        >
                            <span className="material-icons text-base">call</span>
                            Call Emergency Services
                        </a>
                    </div>
                )}

                {/* Footer note */}
                <div className="text-center py-2">
                    <p className="text-[11px] text-gray-400">This page updates automatically in real-time.</p>
                    <p className="text-[11px] text-gray-400">Powered by RedFlag Guardian Mode 🛡️</p>
                </div>
            </main>
        </div>
    );
}
