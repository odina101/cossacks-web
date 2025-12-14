// Unit module - ES6 version
import { CommandHandler } from './CommandHandler.js';
import { Command } from './Command.js';

export class Unit {
    constructor(name) {
        this.name = name;
        this.hp = 100;
        this.speed = 4; // pixels per tick
        this.x = 0;
        this.y = 0;

        this.states = [];
        this.n = 0; // direction (0-15)
        this.activeState = 0;

        this.commandHandler = new CommandHandler(this);
        this.State = {};
        this.IsSelected = false;

        // Movement state
        this.path = null;
        this.pathIndex = 0;
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;
        this.animationCounter = 0; // Counter for animation frame updates
    }

    tick() {
        // Skip old command system while using new moveTo movement
        if (this.isMoving) {
            return;
        }
        this.commandHandler.HandleCommandQueue();
    }

    AddCommand(command) {
        this.commandHandler.AddCommand(command);
    }

    GetDefaultCommand() {
        const random = Math.random() * 100;
        const rest = Math.random() > 0.2 ? 1 : 0;

        const defaultCommand = new Command({
            commandHandler: this.commandHandler,
            callback: (user, i) => {
                if (!rest) {
                    user.State.j += 1;
                    user.State.j %= user.State.k;
                }
            },
            finishConditions: (user, i) => {
                return i > user.State.k;
            },
            init: (user) => {
                // Keep current state, just reset frame
                user.State.j = 0;
            },
            priority: -1
        });

        return defaultCommand;
    }

    SetState(state) {
        this.activeState = state;
        this.State = this.states[state];
    }

    Rotate() {
        const command = new Command({
            commandHandler: this.commandHandler,
            callback: (user, i) => {
                user.n = i % 16;
            },
            finishConditions: (user, i) => {
                return i > 100;
            }
        });

        this.AddCommand(command);
    }

    go(N, priority) {
        const stepsNumber = 30;

        const command = new Command({
            commandHandler: this.commandHandler,
            callback: (user, i, initData) => {
                if (initData && initData[i]) {
                    user.x = initData[i][0];
                    user.y = initData[i][1];

                    user.State.j += 1;
                    user.State.j %= user.State.k;
                }

                // Keep current state, just update direction
                user.n = N;
            },
            finishConditions: (user, i) => {
                return i > stepsNumber - 10;
            },
            init: (user) => {
                const cachedCoordinates = new Array(stepsNumber);
                const initCoordinates = [user.x, user.y];

                const dx = Math.cos((N + 4) * (Math.PI / 8));
                const dy = Math.sin((N + 4) * (Math.PI / 8));

                for (let i = 0; i < cachedCoordinates.length - 1; i++) {
                    cachedCoordinates[i] = [
                        Math.round(initCoordinates[0] + dx * i * user.speed),
                        Math.round(initCoordinates[1] + dy * i * user.speed)
                    ];
                }

                return cachedCoordinates;
            },
            priority: priority || 0
        });

        this.AddCommand(command);
    }

    toString() {
        return this.name;
    }

    // Move to a specific position - direct movement (no A* for now)
    moveTo(targetX, targetY, pathfinder) {
        const distance = Math.sqrt((targetX - this.x) ** 2 + (targetY - this.y) ** 2);
        console.log(`[Unit] MOVE ORDER: (${Math.round(this.x)}, ${Math.round(this.y)}) -> (${Math.round(targetX)}, ${Math.round(targetY)}) distance: ${Math.round(distance)}`);
        
        // Clear old command system
        this.commandHandler.commandsQueue.clear();
        this.commandHandler.currentCommand = null;
        this.commandHandler.commandIsExecuting = false;
        
        // Set up path
        this.path = [
            { x: this.x, y: this.y },
            { x: targetX, y: targetY }
        ];
        this.pathIndex = 1;
        this.targetX = targetX;
        this.targetY = targetY;
        this.isMoving = true;
        
        // Calculate initial direction immediately
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            const initialDirection = this.getDirectionFromVector(dx, dy);
            console.log(`[Unit] Initial direction set to ${initialDirection} (was ${this.n})`);
            this.n = initialDirection;
        }
        
        // Switch to walk animation
        this.switchToAnimation('G');
        console.log(`[Unit] Movement started, isMoving=${this.isMoving}, path length=${this.path.length}, direction=${this.n}`);
    }

    // Update movement each frame
    updateMovement() {
        if (!this.isMoving || !this.path || this.pathIndex >= this.path.length) {
            if (this.isMoving) {
                console.log('[Unit] Reached destination! Final position:', Math.round(this.x), Math.round(this.y), 'Final direction:', this.n);
                this.isMoving = false;
                this.path = null;
                // Switch to standing animation (S = stand)
                this.switchToAnimation('S');
            }
            return;
        }

        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
            // Reached waypoint, move to next
            this.x = target.x;
            this.y = target.y;
            this.pathIndex++;
            console.log(`[Unit] Reached waypoint ${this.pathIndex}/${this.path.length}`);
            
            // Update direction for next segment if there is one
            if (this.pathIndex < this.path.length) {
                const nextTarget = this.path[this.pathIndex];
                const nextDx = nextTarget.x - this.x;
                const nextDy = nextTarget.y - this.y;
                const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
                
                if (nextDistance > 0.1) {
                    this.n = this.getDirectionFromVector(nextDx, nextDy);
                }
            }
            
            // Update animation frame
            if (this.State && this.State.k) {
                this.State.j = (this.State.j + 1) % this.State.k;
            }
        } else {
            // Update direction based on movement BEFORE moving
            // This ensures we use the full vector, not a small remainder
            if (distance > 0.1) { // Only update direction if we have a meaningful vector
                this.n = this.getDirectionFromVector(dx, dy);
            }
            
            // Move towards waypoint
            const vx = (dx / distance) * this.speed;
            const vy = (dy / distance) * this.speed;
            
            this.x += vx;
            this.y += vy;
            
            // Update animation frame at a consistent rate
            // Advance animation counter and update frame every 3-4 pixels traveled
            this.animationCounter += this.speed;
            const pixelsPerFrame = 5; // Adjust this to change animation speed (lower = faster)
            
            if (this.State && this.State.k && this.animationCounter >= pixelsPerFrame) {
                this.State.j = (this.State.j + 1) % this.State.k;
                this.animationCounter -= pixelsPerFrame;
            }
            
            // Log every ~30 ticks (about once per second)
            if (Math.random() < 0.03) {
                console.log(`[Unit] Moving... pos=(${Math.round(this.x)}, ${Math.round(this.y)}) remaining=${Math.round(distance)} dir=${this.n}`);
            }
        }
    }

    // Get direction (0-15) from movement vector
    getDirectionFromVector(dx, dy) {
        // Validate inputs
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
            console.warn('[Unit] getDirectionFromVector called with near-zero vector, keeping current direction');
            return this.n; // Keep current direction if vector is too small
        }
        
        // Calculate angle from movement vector
        let angle = Math.atan2(dy, dx);
        
        // Convert to 0-16 direction matching the original formula:
        // In original: dx = cos((N+4)*PI/8), dy = sin((N+4)*PI/8)
        // So when N=0: angle = atan2(sin(4*PI/8), cos(4*PI/8)) = atan2(1, 0) = PI/2
        // This means N=0 should be pointing down (south)
        
        // Reverse the original formula: angle = (N+4)*PI/8
        // So: N = (angle / (PI/8)) - 4
        let direction = (angle / (Math.PI / 8)) - 4;
        
        // Normalize to 0-15 range
        direction = Math.round(direction) % 16;
        if (direction < 0) direction += 16;
        
        // Validate output
        if (isNaN(direction) || direction < 0 || direction > 15) {
            console.error('[Unit] Invalid direction calculated:', direction, 'from dx=', dx, 'dy=', dy, 'angle=', angle);
            return this.n; // Keep current direction if calculation fails
        }
        
        return direction;
    }
    
    // Static method to test direction calculation
    static testDirectionCalculation() {
        console.log('=== Testing Direction Calculation ===');
        const testUnit = { n: 0 };
        
        for (let N = 0; N < 16; N++) {
            // Use original formula to get dx, dy
            const dx = Math.cos((N + 4) * (Math.PI / 8));
            const dy = Math.sin((N + 4) * (Math.PI / 8));
            
            // Calculate direction from this vector
            let angle = Math.atan2(dy, dx);
            let direction = (angle / (Math.PI / 8)) - 4;
            direction = Math.round(direction) % 16;
            if (direction < 0) direction += 16;
            
            const match = direction === N ? '✓' : '✗';
            console.log(`N=${N.toString().padStart(2)}: dx=${dx.toFixed(3)}, dy=${dy.toFixed(3)} -> dir=${direction.toString().padStart(2)} ${match}`);
        }
    }

    // Switch to a specific animation type
    switchToAnimation(animType) {
        if (!this.currentCharacter || !window.characterGroups) return;
        
        const charGroup = window.characterGroups[this.currentCharacter];
        if (!charGroup || !charGroup.animations[animType]) return;
        
        const spriteName = this.currentCharacter + animType;
        const stateIndex = window.sprites.findIndex(s => s.UnitName === spriteName);
        
        if (stateIndex >= 0) {
            this.SetState(stateIndex);
        }
    }

    // Stop all movement
    stop() {
        this.path = null;
        this.pathIndex = 0;
        this.isMoving = false;
        this.switchToAnimation('S');
    }
}

