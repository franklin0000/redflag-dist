/**
 * Swarm Agent
 * Represents a single worker unit in the swarm.
 * Capable of executing tasks asynchronously and reporting status.
 */

export const AGENT_STATUS = {
    IDLE: 'IDLE',
    WORKING: 'WORKING',
    ERROR: 'ERROR',
    OFFLINE: 'OFFLINE'
};

export class SwarmAgent {
    constructor(id, orchestrator) {
        this.id = id;
        this.orchestrator = orchestrator; // Reference back to reporting authority
        this.status = AGENT_STATUS.IDLE;
        this.currentTask = null;
        this.logs = [];
    }

    /**
     * Assign a task to this agent
     */
    async assignTask(task) {
        if (this.status !== AGENT_STATUS.IDLE) {
            throw new Error(`Agent ${this.id} is busy or offline.`);
        }

        this.status = AGENT_STATUS.WORKING;
        this.currentTask = task;
        this.log(`Received task: ${task.type}`);

        try {
            // Simulate processing based on task type
            // In a real scenario, this would switch on task.type and call APIs
            await this.processTask(task);

            this.log(`Task completed: ${task.type}`);
            this.orchestrator.reportCompletion(this.id, task, null);
        } catch (error) {
            this.status = AGENT_STATUS.ERROR;
            this.log(`Error: ${error.message}`);
            this.orchestrator.reportCompletion(this.id, task, error);
            // Auto-recover after error
            setTimeout(() => {
                this.status = AGENT_STATUS.IDLE;
            }, 2000);
        } finally {
            if (this.status !== AGENT_STATUS.ERROR) {
                this.status = AGENT_STATUS.IDLE;
                this.currentTask = null;
            }
        }
    }

    /**
     * Simulate work with artificial delay
     */
    async processTask(task) {
        const duration = task.duration || Math.floor(Math.random() * 2000) + 500; // 0.5s to 2.5s

        // Split work into chunks to allow UI to breathe if this was real JS heavy work
        // For simulation, we just await a timeout
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    log(message) {
        const entry = `[${new Date().toLocaleTimeString()}] Agent ${this.id}: ${message}`;
        this.logs.push(entry);
        // Optional: Pipe to central logger
    }
}
