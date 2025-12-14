// PriorityQueue module - ES6 version
export class PriorityQueue {
    constructor(priorityProperty) {
        this.priorityProperty = priorityProperty;
        this.items = [];
    }

    insert(item) {
        this.items.push(item);
        // Sort by priority (higher priority first)
        this.items.sort((a, b) => b[this.priorityProperty] - a[this.priorityProperty]);
    }

    IsEmpty() {
        return this.items.length === 0;
    }

    getHighestPriorityElement() {
        if (this.IsEmpty()) {
            return null;
        }
        return this.items[0];
    }

    shiftHighestPriorityElement() {
        if (this.IsEmpty()) {
            return null;
        }
        return this.items.shift();
    }

    size() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    toString() {
        return this.items.map(item => item.toString()).join(', ');
    }
}

