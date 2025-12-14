// Command module - ES6 version
export class Command {
    constructor(options) {
        this.commandHandler = options.commandHandler;
        this.callback = options.callback;
        this.finishConditions = options.finishConditions;
        this.i = 0; // command iteration
        this.initialised = false;
        this.init = options.init;
        this.initData = {};
        this.priority = options.priority || 0;
    }

    Execute() {
        if (!this.initialised) {
            if (this.init !== undefined) {
                this.initData = this.init(this.commandHandler.unit);
                this.initialised = true;
            }
        }

        this.callback(this.commandHandler.unit, this.i, this.initData);
        this.commandHandler.commandIsExecuting = true;

        this.i++;
        if (this.finishConditions(this.commandHandler.unit, this.i) === true) {
            this.commandHandler.commandIsExecuting = false;
        }
    }

    toString() {
        return `[*${this.priority}] `;
    }
}

