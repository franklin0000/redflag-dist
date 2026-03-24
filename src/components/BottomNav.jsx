
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const { pathname } = useLocation();

    const navItems = [
        { to: '/', icon: 'home', label: 'Home', match: (p) => p === '/' },
        { to: '/map', icon: 'map', label: 'Radar', match: (p) => p.startsWith('/map') },
        { to: '/chat', icon: 'forum', label: 'Chat', match: (p) => p.startsWith('/chat') },
        { to: '/profile', icon: 'person', label: 'Profile', match: (p) => p.startsWith('/profile') },
    ];

    const activeIndex = navItems.findIndex(item => item.match(pathname));

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 max-w-md mx-auto">
            <div className="flex justify-around items-center h-16 px-2 relative">
                {/* Animated active indicator */}
                <div
                    className="absolute top-0 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out pointer-events-none"
                    style={{
                        width: '20%',
                        left: activeIndex >= 2
                            ? `${((activeIndex + 1) / 5) * 100}%`
                            : `${(activeIndex / 5) * 100}%`,
                        transform: 'translateX(30%)',
                    }}
                />

                {navItems.slice(0, 2).map(({ to, icon, label, match }) => {
                    const isActive = match(pathname);
                    return (
                        <Link key={to} to={to} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${isActive ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95'}`}>
                            <span className={`material-icons text-2xl mb-0.5 transition-transform duration-200 ${isActive ? 'drop-shadow-[0_0_6px_rgba(212,17,180,0.4)]' : ''}`}>{icon}</span>
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
                <div className="relative -top-5">
                    <Link to="/report/new" className="w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center text-white transform transition-all active:scale-90 hover:shadow-primary/60 hover:shadow-xl border-4 border-background-light dark:border-background-dark">
                        <span className="material-icons text-2xl">add</span>
                    </Link>
                </div>
                {navItems.slice(2).map(({ to, icon, label, match }) => {
                    const isActive = match(pathname);
                    return (
                        <Link key={to} to={to} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${isActive ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-95'}`}>
                            <span className={`material-icons text-2xl mb-0.5 transition-transform duration-200 ${isActive ? 'drop-shadow-[0_0_6px_rgba(212,17,180,0.4)]' : ''}`}>{icon}</span>
                            <span className="text-[10px] font-medium">{label}</span>
                        </Link>
                    );
                })}
            </div>
            {/* iPhone Home Indicator Spacer */}
            <div className="h-1 w-full"></div>
        </nav>
    );
}
