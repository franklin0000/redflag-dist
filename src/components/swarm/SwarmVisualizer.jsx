import React, { useEffect, useState, useRef } from 'react';
import { swarmOrchestrator } from '../../services/swarm/SwarmOrchestrator';
import { AGENT_STATUS } from '../../services/swarm/SwarmAgent';

export default function SwarmVisualizer() {
    const [snapshot, setSnapshot] = useState(swarmOrchestrator.getSnapshot());
    const [log, setLog] = useState([]);
    const logEndRef = useRef(null);

    const addLog = (msg) => {
        setLog(prev => [...prev.slice(-49), msg]); // Keep last 50 logs
    };

    useEffect(() => {
        // Initialize
        swarmOrchestrator.init();

        // Subscribe to events
        const unsubscribe = swarmOrchestrator.subscribe((event, data) => {
            // Update snapshot on relevant events
            if (['agent_status_change', 'task_added', 'scale_update', 'agents_spawned', 'agents_despawned', 'stats_update'].includes(event)) {
                setSnapshot(swarmOrchestrator.getSnapshot());
            }

            // Logging
            if (event === 'agent_status_change' && data.status === AGENT_STATUS.WORKING) {
                addLog(`[AGENT ${data.id}] Started task: ${data.task.type}`);
            } else if (event === 'agent_status_change' && data.result) {
                addLog(`[AGENT ${data.id}] Task finished: ${data.result}`);
            } else if (event === 'scale_update') {
                // reduce noise, maybe don't log every scale check
            } else {
                addLog(`[SYSTEM] ${event}: ${JSON.stringify(data)}`);
            }
        });

        return () => {
            unsubscribe();
            swarmOrchestrator.stop();
        };
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    // Render helpers
    const getAgentColor = (status) => {
        switch (status) {
            case AGENT_STATUS.IDLE: return 'bg-gray-700 border-gray-600 text-gray-400';
            case AGENT_STATUS.WORKING: return 'bg-blue-600 border-blue-400 text-white animate-pulse';
            case AGENT_STATUS.ERROR: return 'bg-red-600 border-red-400 text-white';
            default: return 'bg-black border-gray-800 text-gray-600';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white p-4 gap-4">
            {/* Header / Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Active Agents</h3>
                    <div className="text-3xl font-bold text-blue-400">{snapshot.agents.length} <span className="text-sm text-gray-500">/ {snapshot.maxAgents}</span></div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Queue Depth</h3>
                    <div className="text-3xl font-bold text-purple-400">{snapshot.queueLength}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-gray-400 text-xs uppercase">Tasks Completed</h3>
                    <div className="text-3xl font-bold text-green-400">{snapshot.stats.tasksCompleted}</div>
                </div>
            </div>

            {/* Main Agent Grid */}
            <div className="flex-1 bg-gray-950 rounded-xl border border-gray-800 p-4 overflow-y-auto">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {snapshot.agents.map(agent => (
                        <div key={agent.id} className={`h-16 rounded border flex flex-col items-center justify-center text-xs transition-colors duration-300 ${getAgentColor(agent.status)}`}>
                            <span className="font-mono opacity-50">#{agent.id}</span>
                            <span className="font-bold">{agent.status}</span>
                        </div>
                    ))}
                    {/* Placeholders for scaling visualization */}
                    {Array.from({ length: 50 - snapshot.agents.length }).map((_, i) => (
                        <div key={`d-${i}`} className="h-16 rounded border border-gray-800 bg-gray-900/20 flex items-center justify-center opacity-20">
                            <span className="text-xs text-gray-700">•</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Console Log */}
            <div className="h-48 bg-black font-mono text-xs p-2 overflow-y-auto border-t border-gray-800 text-green-500 opacity-80 rounded-lg">
                {log.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}
