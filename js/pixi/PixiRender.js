// PixiJS Renderer - Replaces the Canvas2D renderer
export class PixiRender {
    constructor(options) {
        this.world = options.world;
        this.canvas_width = options.width;
        this.canvas_height = options.height;
        this.containerId = options.containerId;

        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;

        this.app = null;
        this.unitSprites = new Map();
        this.textures = {};
        this.worldContainer = null;
    }

    async init(progressCallback) {
        // Create PixiJS Application
        this.app = new PIXI.Application({
            width: this.canvas_width,
            height: this.canvas_height,
            backgroundColor: 0x1a1a2e,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });

        // Add canvas to container
        const container = document.getElementById(this.containerId);
        container.appendChild(this.app.view);

        // Create world container (for camera movement)
        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);

        // Create procedural grass terrain
        this.createGrassTerrain();

        // Create move target indicator (shows where clicks go)
        this.moveTargetGraphics = new PIXI.Graphics();
        this.worldContainer.addChild(this.moveTargetGraphics);
        
        // Create click indicator
        this.clickIndicator = new PIXI.Graphics();
        this.worldContainer.addChild(this.clickIndicator);
        this.clickIndicatorTimer = 0;

        // Load all sprite textures
        await this.loadTextures(progressCallback);

        // Setup input handlers
        this.setupInputHandlers();

        // Start the game loop
        this.app.ticker.add(() => this.gameLoop());
    }

    async loadTextures(progressCallback) {
        const spritesToLoad = window.sprites;
        const buildingsToLoad = window.buildings || [];
        const totalToLoad = spritesToLoad.length + buildingsToLoad.length;
        let loaded = 0;
        
        console.log('[PixiRender v2] Loading textures for', spritesToLoad.length, 'sprites and', buildingsToLoad.length, 'buildings');

        // Load unit sprites
        for (const spriteData of spritesToLoad) {
            const url = `sprites_png/${spriteData.UnitName}/${spriteData.UnitName}.png`;
            
            try {
                const texture = await PIXI.Assets.load(url);
                this.textures[spriteData.UnitName] = texture;
                loaded++;
                if (progressCallback) {
                    progressCallback(loaded / totalToLoad);
                }
            } catch (error) {
                console.warn(`Failed to load texture: ${url}`, error);
            }
        }

        // Load building sprites
        for (const buildingData of buildingsToLoad) {
            const url = `sprites_png/${buildingData.Name}/${buildingData.Name}.png`;
            
            try {
                const texture = await PIXI.Assets.load(url);
                this.textures[buildingData.Name] = texture;
                loaded++;
                if (progressCallback) {
                    progressCallback(loaded / totalToLoad);
                }
            } catch (error) {
                console.warn(`Failed to load building texture: ${url}`, error);
            }
        }
    }

    setupInputHandlers() {
        // Keyboard handler for unit direction
        window.addEventListener('keydown', (e) => {
            if (e.keyCode === 37) { // Left arrow
                window.unit.n = (window.unit.n - 1 + 16) % 16;
            }
            if (e.keyCode === 39) { // Right arrow
                window.unit.n = (window.unit.n + 1) % 16;
            }
        });

        // Mouse handler for selection
        this.app.view.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e);
        });
    }

    handleMouseDown(e) {
        const rect = this.app.view.getBoundingClientRect();
        const scaleX = this.app.view.width / rect.width;
        const scaleY = this.app.view.height / rect.height;
        
        const offsetX = (e.clientX - rect.left) * scaleX;
        const offsetY = (e.clientY - rect.top) * scaleY;

        // Right click to move
        if (e.button === 2) {
            const worldX = offsetX + this.canvasOffsetX;
            const worldY = offsetY + this.canvasOffsetY;
            // Could implement pathfinding here
            console.log('Right click at world:', worldX, worldY);
        }

        // Left click to select units
        for (const unit of this.world.units) {
            const actualUnitHalfWidth = 20;
            const actualUnitHalfHeight = 70;

            const unitScreenX = unit.x + unit.State.xSymmetry - this.canvasOffsetX;
            const unitScreenY = unit.y + unit.State.ySymmetry - this.canvasOffsetY;

            unit.IsSelected = 
                unitScreenX - actualUnitHalfWidth < offsetX &&
                unitScreenX + actualUnitHalfWidth > offsetX &&
                unitScreenY - actualUnitHalfHeight < offsetY &&
                unitScreenY + actualUnitHalfHeight > offsetY;
        }
    }

    gameLoop() {
        this.renderBuildings();
        this.renderUnits();
        
        // Fade out click indicator
        if (this.clickIndicatorTimer > 0) {
            this.clickIndicatorTimer--;
            this.clickIndicator.alpha = this.clickIndicatorTimer / 60;
            if (this.clickIndicatorTimer <= 0) {
                this.clickIndicator.clear();
            }
        }
    }

    renderBuildings() {
        const buildings = this.world.buildings || [];

        for (const building of buildings) {
            if (!building.sprite) {
                // Create sprite for this building
                const texture = this.textures[building.type];
                if (texture) {
                    building.sprite = new PIXI.Sprite(texture);
                    // Center the building on its position
                    building.sprite.anchor.set(0.5, 0.9); // Bottom center
                    this.worldContainer.addChildAt(building.sprite, 0); // Behind units
                }
            }

            if (building.sprite) {
                building.sprite.x = building.x;
                building.sprite.y = building.y;
            }
        }
    }

    renderUnits() {
        const units = this.world.units;

        for (const unit of units) {
            let pixiSprite = this.unitSprites.get(unit);
            
            if (!pixiSprite) {
                // Create sprite for this unit
                pixiSprite = this.createUnitSprite(unit);
                if (pixiSprite) {
                    this.unitSprites.set(unit, pixiSprite);
                    this.worldContainer.addChild(pixiSprite.container);
                }
            }

            if (pixiSprite) {
                this.updateUnitSprite(unit, pixiSprite);
            }
        }

        // Update world container position (camera)
        this.worldContainer.x = -this.canvasOffsetX;
        this.worldContainer.y = -this.canvasOffsetY;
    }

    createUnitSprite(unit) {
        const state = unit.State;
        if (!state || !this.textures[state.spriteName]) {
            return null;
        }

        const baseTexture = this.textures[state.spriteName];
        
        // Create container for the unit
        const container = new PIXI.Container();

        // Create the sprite with current frame texture
        const frameTexture = this.getFrameTexture(baseTexture, state, unit.n);
        const sprite = new PIXI.Sprite(frameTexture);

        // Selection indicator (ellipse)
        const selectionGraphics = new PIXI.Graphics();
        
        // Debug center point
        const centerPoint = new PIXI.Graphics();
        centerPoint.beginFill(0x0000ff);
        centerPoint.drawRect(state.xSymmetry - 4, state.ySymmetry - 4, 8, 8);
        centerPoint.endFill();

        container.addChild(sprite);
        container.addChild(selectionGraphics);
        container.addChild(centerPoint);

        return {
            container,
            sprite,
            selectionGraphics,
            centerPoint
        };
    }

    getFrameTexture(baseTexture, state, direction) {
        const spriteWidth = state.spriteWidth;
        const spriteHeight = state.spriteHeight;
        const frameIndex = state.j;

        // Original sprite sheet layout:
        // X-axis: direction (unit.n, 0-15)
        // Y-axis: animation frame (state.j)
        const sx = spriteWidth * direction;
        const sy = spriteHeight * frameIndex;

        // Create a texture from the sprite sheet
        const frame = new PIXI.Rectangle(sx, sy, spriteWidth, spriteHeight);
        return new PIXI.Texture(baseTexture.baseTexture, frame);
    }

    updateUnitSprite(unit, pixiSprite) {
        const state = unit.State;
        const baseTexture = this.textures[state.spriteName];

        if (!baseTexture) return;

        // Update position
        pixiSprite.container.x = unit.x;
        pixiSprite.container.y = unit.y;

        // Update frame texture
        const newTexture = this.getFrameTexture(baseTexture, state, unit.n);
        pixiSprite.sprite.texture = newTexture;

        // Update selection graphics
        pixiSprite.selectionGraphics.clear();
        if (unit.IsSelected) {
            // Draw selection circle
            pixiSprite.selectionGraphics.lineStyle(2, 0x00ff00, 0.8);
            pixiSprite.selectionGraphics.drawEllipse(
                state.xSymmetry,
                state.ySymmetry,
                30,
                15
            );
            
            // Draw move path if unit is moving
            if (unit.isMoving && unit.path && unit.pathIndex < unit.path.length) {
                pixiSprite.selectionGraphics.lineStyle(1, 0x00ff00, 0.5);
                pixiSprite.selectionGraphics.moveTo(state.xSymmetry, state.ySymmetry);
                
                for (let i = unit.pathIndex; i < unit.path.length; i++) {
                    const point = unit.path[i];
                    pixiSprite.selectionGraphics.lineTo(
                        point.x - unit.x + state.xSymmetry,
                        point.y - unit.y + state.ySymmetry
                    );
                }
                
                // Draw destination marker
                const lastPoint = unit.path[unit.path.length - 1];
                pixiSprite.selectionGraphics.lineStyle(2, 0x00ff00, 0.8);
                pixiSprite.selectionGraphics.drawCircle(
                    lastPoint.x - unit.x + state.xSymmetry,
                    lastPoint.y - unit.y + state.ySymmetry,
                    8
                );
            }
        }

        // Hide debug center point (too noisy)
        pixiSprite.centerPoint.clear();
    }

    // Show a visual indicator at click position
    showClickAt(worldX, worldY) {
        this.clickIndicator.clear();
        this.clickIndicator.lineStyle(3, 0xff0000, 1);
        this.clickIndicator.drawCircle(worldX, worldY, 15);
        this.clickIndicator.lineStyle(2, 0xffff00, 1);
        this.clickIndicator.moveTo(worldX - 10, worldY);
        this.clickIndicator.lineTo(worldX + 10, worldY);
        this.clickIndicator.moveTo(worldX, worldY - 10);
        this.clickIndicator.lineTo(worldX, worldY + 10);
        this.clickIndicatorTimer = 60; // Fade after 60 frames
    }

    createGrassTerrain() {
        const terrainGraphics = new PIXI.Graphics();
        const tileSize = 64;
        
        // Base grass colors
        const grassColors = [0x4a7c3c, 0x5a8c4c, 0x3a6c2c, 0x4a8c3a, 0x3a7c3a];
        
        // Draw grass tiles with variation
        for (let x = 0; x < this.world.width; x += tileSize) {
            for (let y = 0; y < this.world.height; y += tileSize) {
                // Pick a random grass color based on position (deterministic)
                const colorIndex = Math.abs((x * 13 + y * 7) % grassColors.length);
                terrainGraphics.beginFill(grassColors[colorIndex]);
                terrainGraphics.drawRect(x, y, tileSize, tileSize);
                terrainGraphics.endFill();
            }
        }
        
        this.worldContainer.addChild(terrainGraphics);
        console.log('[PixiRender] Grass terrain created:', this.world.width, 'x', this.world.height);
    }

    CenterView() {
        this.canvasOffsetX = (this.world.width - this.canvas_width) / 2;
        this.canvasOffsetY = (this.world.height - this.canvas_height) / 2;
    }

    MoveCanvasToRight() {
        this.canvasOffsetX += 50;
    }

    MoveCanvasToLeft() {
        this.canvasOffsetX -= 50;
    }

    MoveCanvasToUp() {
        this.canvasOffsetY -= 50;
    }

    MoveCanvasToDown() {
        this.canvasOffsetY += 50;
    }

    ToCanvasX(x) {
        return x - this.canvasOffsetX;
    }

    ToCanvasY(y) {
        return y - this.canvasOffsetY;
    }
}

