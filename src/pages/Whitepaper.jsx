import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Whitepaper() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f0a0e] flex flex-col">
            {/* Back header */}
            <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-[#0f0a0e] border-b border-[#2a1527] sticky top-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <span className="material-icons text-white text-xl">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-white font-bold text-base leading-tight">$RFLAG White Paper</h1>
                    <p className="text-[11px] text-[#7a5a77]">RedFlag Token · Polygon Network</p>
                </div>
                <div className="ml-auto">
                    <a
                        href="/whitepaper.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <span className="material-icons text-white text-xl">open_in_new</span>
                    </a>
                </div>
            </div>

            {/* Iframe rendering the whitepaper */}
            <iframe
                src="/whitepaper.html"
                title="$RFLAG White Paper"
                className="flex-1 w-full border-0"
                style={{ minHeight: 'calc(100vh - 64px)' }}
            />
        </div>
    );
}
