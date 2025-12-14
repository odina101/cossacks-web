// World module - ES6 version
export class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.units = [];
        this.TimeQuantumNumber = 0;
        this.QuantumEpoch = 0;
        this.TickTime = 30;
        this.intervalId = null;
    }

    Run() {
        console.log('[World] Starting game loop...');
        this.intervalId = setInterval(() => {
            for (const unit of this.units) {
                unit.tick();
                // Update movement (pathfinding-based)
                if (unit.updateMovement) {
                    unit.updateMovement();
                }
            }

            this.TimeQuantumNumber++;

            if (this.TimeQuantumNumber === 1024) {
                this.QuantumEpoch++;
                this.TimeQuantumNumber = 0;
            }
        }, this.TickTime);
    }

    Stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

