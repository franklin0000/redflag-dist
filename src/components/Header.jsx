import React, { useState, useRef, useEffect } from 'react';
import { useDating } from '../context/DatingContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications } from '../services/notificationService';

export default function Header() {
    const { toggleMode } = useDating();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!user?.id) return;
        const unsub = subscribeToNotifications(user.id, (notifs) => {
            setUnreadCount(notifs.filter(n => !n.read).length);
        });
        return unsub;
    }, [user?.id]);

    const handleDatingSwitch = () => {
        toggleMode();
        navigate('/dating');
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const handleLogout = async () => {
        setMenuOpen(false);
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const menuItems = [
        { icon: 'person', label: 'Mi Perfil', path: '/profile', color: 'text-primary' },
        { icon: 'settings', label: 'Configuración', path: '/settings', color: 'text-blue-400' },
        { icon: 'verified_user', label: 'Verificación', path: '/verify', color: 'text-green-400' },
        { icon: 'support_agent', label: 'Soporte', path: '/support', color: 'text-yellow-400' },
    ];

    return (
        <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-5 py-4 flex justify-between items-center border-b border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,17,180,0.5)]">
                    <span className="material-icons text-white text-lg">flag</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">RedFlag</h1>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleDatingSwitch}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white shadow-lg hover:opacity-90 transition-opacity"
                >
                    <span className="material-icons text-sm">favorite</span>
                    <span className="text-xs font-bold uppercase tracking-wide">Dating Mode</span>
                </button>

                <button
                    onClick={() => navigate('/notifications')}
                    className="relative w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                    <span className="material-icons text-gray-600 dark:text-gray-300">notifications</span>
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background-light dark:ring-background-dark animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>

                {/* Profile Avatar — Dropdown Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${menuOpen
                                ? 'bg-primary/30 ring-2 ring-primary shadow-[0_0_12px_rgba(212,17,180,0.4)]'
                                : 'bg-gray-200 dark:bg-white/10 hover:bg-primary/20'
                            }`}
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span className="material-icons text-gray-600 dark:text-gray-300">person</span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {menuOpen && (
                        <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-page-in z-[100]">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {user?.name || user?.email?.split('@')[0] || 'Usuario'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.email || ''}
                                </p>
                                {user?.isVerified && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-green-500 uppercase tracking-wider">
                                        <span className="material-icons text-[12px]">verified</span>
                                        Verificado
                                    </span>
                                )}
                            </div>

                            {/* Menu Items */}
                            <div className="py-1">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate(item.path);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <span className={`material-icons text-lg ${item.color}`}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Logout */}
                            <div className="border-t border-gray-100 dark:border-white/5 py-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                    <span className="material-icons text-lg">logout</span>
                                    <span className="font-medium">Cerrar Sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
