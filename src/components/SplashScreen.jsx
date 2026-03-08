import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFading(true);
            setTimeout(onComplete, 400);
        }, 2000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[200] bg-background-dark flex flex-col items-center justify-center ${fading ? 'animate-splash-out' : ''}`}>
            {/* Background glow */}
            <div className="absolute w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Logo */}
            <div className="relative animate-splash-pulse">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(212,17,180,0.5)] mb-6">
                    <span className="material-icons text-white text-4xl">flag</span>
                </div>
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight mt-2">
                RedFlag<span className="text-primary">.io</span>
            </h1>
            <p className="text-sm text-gray-400 mt-2">Protecting your relationships</p>

            {/* Progress bar */}
            <div className="w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-[splash-progress_2s_ease-in-out_forwards]"></div>
            </div>

            <style>{`
                @keyframes splash-progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}
