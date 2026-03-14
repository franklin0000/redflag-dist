import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userExtras } from '../services/api';

export default function SafetyHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeGuardian, setActiveGuardian] = useState(null);
    const [guardianHistory, setGuardianHistory] = useState([]);
    const [dateGuardHistory, setDateGuardHistory] = useState([]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            try {
                const [guardianData, dateGuardData] = await Promise.all([
                    userExtras.getGuardianHistory(),
                    userExtras.getDateGuardHistory()
                ]);
                setGuardianHistory(guardianData || []);
                setDateGuardHistory(dateGuardData || []);
                
                const active = guardianData?.find(g => g.status === 'active');
                if (active) setActiveGuardian(active);
            } catch (err) {
                console.warn('Failed to load safety history:', err);
            }
        };

        fetchData();
    }, [user?.id]);

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'completed': return 'bg-blue-500';
            case 'cancelled': return 'bg-gray-500';
            case 'triggered': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-20">
            <header className="sticky top-0 z-30 bg-gray-900/90 backdrop-blur-lg border-b border-gray-800">
                <div className="flex items-center justify-between px-4 py-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold">Safety History</h1>
                    <div className="w-10" />
                </div>
            </header>

            <div className="p-4 space-y-6">
                {/* Active Guardian Alert */}
                {activeGuardian && (
                    <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-400 font-bold">Guardian Mode Active</span>
                        </div>
                        <p className="text-sm text-gray-300">
                            {activeGuardian.guardian_name} is watching over you
                        </p>
                        <button
                            onClick={() => navigate('/guardian-mode')}
                            className="mt-3 w-full py-2 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-sm"
                        >
                            Open Guardian Dashboard
                        </button>
                    </div>
                )}

                {/* Date Guard Section */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Date Guards ({dateGuardHistory.length})
                    </h2>
                    
                    {dateGuardHistory.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
                            <span className="material-icons text-4xl text-gray-600 mb-3">history</span>
                            <p className="text-gray-400">No date guards yet</p>
                            <button
                                onClick={() => navigate('/date-check-in')}
                                className="mt-4 px-6 py-2 bg-primary rounded-full text-sm font-semibold"
                            >
                                Start Date Guard
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dateGuardHistory.map((guard) => (
                                <div
                                    key={guard.id}
                                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold">{guard.meeting_name || 'Date Guard'}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(guard.status)} text-white`}>
                                            {guard.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="material-icons text-sm">schedule</span>
                                            {formatDate(guard.started_at)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-icons text-sm">timer</span>
                                            {guard.duration_minutes}m
                                        </span>
                                    </div>
                                    {guard.contacts_notified && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                                            <span className="material-icons text-sm">check_circle</span>
                                            Contacts notified
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Guardian History Section */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Guardian Sessions ({guardianHistory.length})
                    </h2>
                    
                    {guardianHistory.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-2xl p-8 text-center">
                            <span className="material-icons text-4xl text-gray-600 mb-3">shield</span>
                            <p className="text-gray-400">No guardian sessions yet</p>
                            <button
                                onClick={() => navigate('/guardian-mode')}
                                className="mt-4 px-6 py-2 bg-primary rounded-full text-sm font-semibold"
                            >
                                Start Guardian Session
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {guardianHistory.map((session) => (
                                <div
                                    key={session.id}
                                    className="bg-gray-800 rounded-xl p-4 border border-gray-700"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold">{session.guardian_name || 'Guardian'}</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(session.status)} text-white`}>
                                            {session.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="material-icons text-sm">schedule</span>
                                            {formatDate(session.started_at)}
                                        </span>
                                        {session.ended_at && (
                                            <span className="flex items-center gap-1">
                                                <span className="material-icons text-sm">timer</span>
                                                {Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 60000)}m
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Quick Actions */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => navigate('/date-check-in')}
                            className="p-4 bg-purple-900/50 rounded-xl border border-purple-500/30 hover:bg-purple-900/70 transition-colors"
                        >
                            <span className="material-icons text-2xl text-purple-400">timer</span>
                            <p className="text-sm font-semibold mt-2">Date Guard</p>
                        </button>
                        <button
                            onClick={() => navigate('/guardian-mode')}
                            className="p-4 bg-blue-900/50 rounded-xl border border-blue-500/30 hover:bg-blue-900/70 transition-colors"
                        >
                            <span className="material-icons text-2xl text-blue-400">shield</span>
                            <p className="text-sm font-semibold mt-2">Guardian</p>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
