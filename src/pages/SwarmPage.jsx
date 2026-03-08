import React from 'react';
import Header from '../components/Header';
import SwarmVisualizer from '../components/swarm/SwarmVisualizer';

export default function SwarmPage() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto p-4 md:p-8 max-w-6xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            SWARM INTELLIGENCE
                        </h1>
                        <p className="text-gray-400">50-Agent Autonomous Processing System</p>
                    </div>
                </div>

                <div className="h-[700px] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10">
                    <SwarmVisualizer />
                </div>
            </main>
        </div>
    );
}
