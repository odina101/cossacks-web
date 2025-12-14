// UnitState module - ES6 version
export class UnitState {
    constructor(spriteName, spriteHeight, spriteWidth, k, id, xSymmetry, ySymmetry) {
        this.spriteName = spriteName;
        this.spriteWidth = spriteWidth;
        this.spriteHeight = spriteHeight;

        this.j = 0; // current sprite frame offset index
        this.k = k; // number of frames

        this.Id = id;
        this.xSymmetry = xSymmetry;
        this.ySymmetry = ySymmetry;
    }

    toString() {
        return `[${this.spriteWidth} ${this.spriteHeight}]`;
    }
}

