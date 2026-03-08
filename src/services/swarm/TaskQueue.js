/**
 * Task Queue for the Swarm System
 * Manages pending tasks with simple FIFO logic (can be upgraded to priority queue).
 */
export class TaskQueue {
    constructor() {
        this.queue = [];
    }

    enqueue(task) {
        this.queue.push({
            ...task,
            id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            addedAt: Date.now(),
        });
    }

    dequeue() {
        return this.queue.shift();
    }

    get length() {
        return this.queue.length;
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    clear() {
        this.queue = [];
    }

    // Peek at the next task without removing
    peek() {
        return this.queue.length > 0 ? this.queue[0] : null;
    }
}
