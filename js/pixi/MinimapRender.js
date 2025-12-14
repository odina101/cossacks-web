// Minimap Renderer using PixiJS
export class MinimapRender {
    constructor(options) {
        this.world = options.world;
        this.render = options.render;
        this.height = options.height;
        this.containerId = options.containerId;
        
        // Calculate width to maintain world aspect ratio
        this.width = this.height * (this.world.width / this.world.height);
        
        this.app = null;
        this.frameGraphics = null;
        this.unitsGraphics = null;
    }

    init() {
        // Create PixiJS Application for minimap
        this.app = new PIXI.Application({
            width: this.width,
            height: this.height,
            backgroundColor: 0x0d1117,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        // Add canvas to container
        const container = document.getElementById(this.containerId);
        container.appendChild(this.app.view);

        // Create graphics objects
        this.frameGraphics = new PIXI.Graphics();
        this.unitsGraphics = new PIXI.Graphics();

        this.app.stage.addChild(this.frameGraphics);
        this.app.stage.addChild(this.unitsGraphics);

        // Start render loop (at lower framerate for minimap)
        this.app.ticker.add(() => this.gameLoop());
    }

    gameLoop() {
        this.renderMinimap();
    }

    renderMinimap() {
        this.frameGraphics.clear();
        this.unitsGraphics.clear();

        this.drawBorder();
        this.drawViewFrame();
        this.drawUnitsDots();
    }

    drawBorder() {
        // Draw minimap border
        this.frameGraphics.lineStyle(1, 0x3498db, 0.5);
        this.frameGraphics.drawRect(0, 0, this.width, this.height);
    }

    drawViewFrame() {
        const miniMapRectX = (this.render.canvasOffsetX / this.world.width) * this.width;
        const miniMapRectY = (this.render.canvasOffsetY / this.world.height) * this.height;

        const miniMapRectWidth = (this.render.canvas_width / this.world.width) * this.width;
        const miniMapRectHeight = (this.render.canvas_height / this.world.height) * this.height;

        // Draw view rectangle
        this.frameGraphics.lineStyle(2, 0x9b59b6, 1);
        this.frameGraphics.drawRect(miniMapRectX, miniMapRectY, miniMapRectWidth, miniMapRectHeight);

        // Fill with transparent color
        this.frameGraphics.beginFill(0x9b59b6, 0.1);
        this.frameGraphics.drawRect(miniMapRectX, miniMapRectY, miniMapRectWidth, miniMapRectHeight);
        this.frameGraphics.endFill();
    }

    drawUnitsDots() {
        const units = this.world.units;

        for (const unit of units) {
            const unitDotX = (unit.x + unit.State.xSymmetry) * (this.width / this.world.width);
            const unitDotY = (unit.y + unit.State.ySymmetry) * (this.height / this.world.height);

            // Draw unit dot
            if (unit.IsSelected) {
                this.unitsGraphics.beginFill(0x2ecc71);
                this.unitsGraphics.drawCircle(unitDotX, unitDotY, 4);
            } else {
                this.unitsGraphics.beginFill(0xe74c3c);
                this.unitsGraphics.drawCircle(unitDotX, unitDotY, 3);
            }
            this.unitsGraphics.endFill();
        }
    }
}

