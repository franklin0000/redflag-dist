/**
 * Swarm Orchestrator
 * Central brain that manages the agent pool, distributes tasks, and handles auto-scaling.
 */
import { TaskQueue } from './TaskQueue';
import { SwarmAgent, AGENT_STATUS } from './SwarmAgent';

class SwarmOrchestrator {
    constructor() {
        this.agents = new Map(); // ID -> Agent Instance
        this.taskQueue = new TaskQueue();
        this.maxAgents = 50;
        this.minAgents = 5;
        this.isRunning = false;
        this.scaleInterval = null;
        this.processInterval = null;

        // Event listeners (simple pub/sub)
        this.listeners = [];

        // Statistics
        this.stats = {
            tasksCompleted: 0,
            tasksFailed: 0,
            startTime: Date.now(),
        };
    }

    /**
     * Initialize the system
     */
    init() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.spawnAgents(this.minAgents);

        // Start the control loops
        this.processInterval = setInterval(() => this.distributeTasks(), 100);
        this.scaleInterval = setInterval(() => this.autoScale(), 2000);

        this.emit('init', { count: this.agents.size });
    }

    /**
     * Stop the system
     */
    stop() {
        this.isRunning = false;
        clearInterval(this.processInterval);
        clearInterval(this.scaleInterval);
        this.agents.forEach(agent => agent.status = AGENT_STATUS.OFFLINE);
        this.emit('stop');
    }

    /**
     * Add a task to the queue
     */
    addTask(task) {
        this.taskQueue.enqueue(task);
        this.emit('task_added', { depth: this.taskQueue.length });
        // Try to process immediately if agents are free
        this.distributeTasks();
    }

    /**
     * Spawn a specific number of new agents (up to MAX)
     */
    spawnAgents(count) {
        let spawned = 0;
        for (let i = 0; i < count; i++) {
            if (this.agents.size >= this.maxAgents) break;

            const id = (this.agents.size + 1).toString().padStart(3, '0');
            const agent = new SwarmAgent(id, this);
            this.agents.set(id, agent);
            spawned++;
        }
        if (spawned > 0) {
            this.emit('agents_spawned', { count: spawned, total: this.agents.size });
        }
    }

    /**
     * Terminate idle agents if we have too many
     */
    despawnAgents(count) {
        let removed = 0;
        // Convert to array to iterate and remove
        for (const [id, agent] of this.agents) {
            if (removed >= count) break;
            if (this.agents.size <= this.minAgents) break;

            if (agent.status === AGENT_STATUS.IDLE) {
                this.agents.delete(id);
                removed++;
            }
        }
        if (removed > 0) {
            this.emit('agents_despawned', { count: removed, total: this.agents.size });
        }
    }

    /**
     * Main Loop: Assign queued tasks to idle agents
     */
    distributeTasks() {
        if (this.taskQueue.isEmpty()) return;

        for (const [id, agent] of this.agents) {
            if (this.taskQueue.isEmpty()) break;

            if (agent.status === AGENT_STATUS.IDLE) {
                const task = this.taskQueue.dequeue();
                agent.assignTask(task);
                this.emit('agent_status_change', { id, status: AGENT_STATUS.WORKING, task });
            }
        }
    }

    /**
     * Auto-scaling Logic
     * If queue depth is high, spawn more agents.
     * If queue is empty and we have too many agents, scale down.
     */
    autoScale() {
        const queueDepth = this.taskQueue.length;
        const activeAgents = this.agents.size;
        const busyAgents = Array.from(this.agents.values()).filter(a => a.status === AGENT_STATUS.WORKING).length;

        // Scale UP condition: Queue is backing up OR all agents are busy with pending work
        if (queueDepth > 10 || (queueDepth > 0 && busyAgents === activeAgents)) {
            const need = Math.min(queueDepth, 10); // Spawn in batches of up to 10
            this.spawnAgents(need);
        }

        // Scale DOWN condition: Queue empty and low utilization
        else if (queueDepth === 0 && busyAgents < activeAgents * 0.5) {
            // Gradually scale down
            this.despawnAgents(Math.ceil((activeAgents - this.minAgents) * 0.2));
        }

        this.emit('scale_update', {
            active: activeAgents,
            busy: busyAgents,
            queue: queueDepth
        });
    }

    /**
     * Callback from Agent when task finishes
     */
    reportCompletion(agentId, task, error) {
        if (error) {
            this.stats.tasksFailed++;
        } else {
            this.stats.tasksCompleted++;
        }

        // Re-notify status
        const agent = this.agents.get(agentId);
        if (agent) {
            this.emit('agent_status_change', { id: agentId, status: agent.status, result: error ? 'error' : 'success' });
        }

        // Trigger distribution pass
        this.distributeTasks();
        this.emit('stats_update', this.stats);
    }

    /**
     * Simple Event Bus
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    emit(event, data) {
        this.listeners.forEach(cb => cb(event, data));
    }

    // Helper to get quick snapshot for UI
    getSnapshot() {
        return {
            agents: Array.from(this.agents.values()).map(a => ({
                id: a.id,
                status: a.status,
                currentTask: a.currentTask
            })),
            queueLength: this.taskQueue.length,
            stats: this.stats,
            maxAgents: this.maxAgents
        };
    }
}

// Singleton Instance
export const swarmOrchestrator = new SwarmOrchestrator();
