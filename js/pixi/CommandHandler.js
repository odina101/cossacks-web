// CommandHandler module - ES6 version
import { PriorityQueue } from './PriorityQueue.js';

export class CommandHandler {
    constructor(unit) {
        this.unit = unit;
        this.commandsQueue = new PriorityQueue('priority');
        this.HighPriorityInterruption = false;
        this.commandIsExecuting = false;
        this.currentCommand = null;
    }

    AddCommand(command) {
        this.commandsQueue.insert(command);
    }

    HandleCommandQueue() {
        if (this.commandsQueue.IsEmpty()) {
            if (this.commandIsExecuting === false) {
                const defaultCommand = this.unit.GetDefaultCommand();
                this.AddCommand(defaultCommand);
            }
        } else {
            const queuedCommand = this.commandsQueue.getHighestPriorityElement();

            if (this.currentCommand && this.currentCommand.priority < queuedCommand.priority) {
                this.AddCommand(this.currentCommand);
                this.HighPriorityInterruption = true;
            }
        }

        if (this.commandIsExecuting === false || this.HighPriorityInterruption) {
            this.currentCommand = this.commandsQueue.shiftHighestPriorityElement();
            this.HighPriorityInterruption = false;
        }

        if (this.currentCommand) {
            this.currentCommand.Execute();
        }
    }
}

