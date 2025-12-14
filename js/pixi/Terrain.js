// Terrain rendering for isometric game
import { TerrainGenerator } from './TerrainGenerator.js?v=1';
import { IsometricTerrainRenderer } from './IsometricTerrainRenderer.js?v=2';
import { TileAssetLoader } from './TileAssetLoader.js?v=1';

export class Terrain {
    constructor(width, height, tileSize = 32) {
        this.width = width;       // Map width in tiles
        this.height = height;     // Map height in tiles
        this.tileSize = tileSize; // Tile size in pixels
        
        // Terrain types
        this.GRASS = 0;
        this.WATER = 1;
        this.SAND = 2;
        this.FOREST = 3;
        
        // Create terrain map (2D array)
        this.map = this.generateTerrain();
        
        // Pixi container for terrain
        this.container = null;
        
        // Terrain texture and metadata
        this.terrainTexture = null;
        this.terrainMetadata = null;
        this.currentMap = null;
        
        // 3D Isometric terrain system
        this.terrainGenerator = null;
        this.isometricRenderer = null;
        this.use3DTerrain = true; // Use new 3D isometric terrain
    }

    generateTerrain() {
        // Create empty map - we use BMP texture for visuals
        const map = [];
        for (let y = 0; y < this.height; y++) {
            map[y] = [];
            for (let x = 0; x < this.width; x++) {
                map[y][x] = this.GRASS; // All grass (walkable)
            }
        }
        return map;
    }
    
    /**
     * Generate new 3D isometric terrain (Cossacks style)
     */
    async generate3DTerrain(seed) {
        console.log('[Terrain] Generating 3D isometric terrain...');
        
        // Load tile assets
        const assetLoader = new TileAssetLoader();
        await assetLoader.loadAssets();
        
        // Create heightmap generator
        this.terrainGenerator = new TerrainGenerator(this.width, this.height);
        this.terrainGenerator.generate(seed);
        
        // Create isometric renderer with asset loader
        this.isometricRenderer = new IsometricTerrainRenderer(
            this.terrainGenerator, 
            this.tileSize,
            assetLoader  // Pass asset loader
        );
        
        // Render to canvas
        const canvas = this.isometricRenderer.renderToCanvas(
            this.width * this.tileSize * 2,  // Wider for isometric
            this.height * this.tileSize * 2  // Taller for isometric
        );
        
        // Convert canvas to PIXI texture
        this.terrainTexture = PIXI.Texture.from(canvas);
        
        // Update walkability map based on terrain type
        this.updateWalkabilityFromHeightmap();
        
        console.log('[Terrain] 3D terrain generated successfully with image tiles!');
    }
    
    /**
     * Update walkability map from heightmap
     */
    updateWalkabilityFromHeightmap() {
        if (!this.terrainGenerator) return;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const terrainType = this.terrainGenerator.getTerrainType(x, y);
                
                // Water is not walkable
                if (terrainType === 'water') {
                    this.map[y][x] = this.WATER;
                } else {
                    this.map[y][x] = this.GRASS;
                }
            }
        }
    }
    
    /**
     * Load an extracted Cossacks map.
     * @param {string} mapName - Name of the map (e.g., 'MATER', 'KONTIN4')
     * @returns {Promise<void>}
     */
    async loadMap(mapName) {
        console.log(`[Terrain] Loading map: ${mapName}`);
        
        try {
            // Load metadata
            const metadataResponse = await fetch(`../extracted_terrain/${mapName}/${mapName}.json`);
            if (!metadataResponse.ok) {
                throw new Error(`Failed to load map metadata: ${metadataResponse.statusText}`);
            }
            this.terrainMetadata = await metadataResponse.json();
            
            console.log(`[Terrain] Map metadata:`, this.terrainMetadata);
            
            // Update dimensions from metadata
            this.width = this.terrainMetadata.width;
            this.height = this.terrainMetadata.height;
            this.tileSize = this.terrainMetadata.tileSize;
            this.currentMap = mapName;
            
            // Load PNG texture
            const texturePath = `../extracted_terrain/${mapName}/${mapName}.png`;
            console.log(`[Terrain] Loading texture from: ${texturePath}`);
            
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    console.log(`[Terrain] Texture loaded: ${img.width}x${img.height}`);
                    this.terrainTexture = PIXI.Texture.from(img);
                    resolve();
                };
                img.onerror = (err) => {
                    console.error(`[Terrain] Failed to load texture:`, err);
                    reject(err);
                };
                img.src = texturePath;
            });
        } catch (error) {
            console.error(`[Terrain] Error loading map:`, error);
            throw error;
        }
    }

    // Get terrain color for a tile type
    getTerrainColor(type) {
        switch (type) {
            case this.WATER: return 0x4a90d9;   // Blue
            case this.SAND: return 0xc2b280;    // Sandy
            case this.FOREST: return 0x228b22;  // Forest green
            case this.GRASS: 
            default: return 0x7cba4a;           // Grass green
        }
    }

    // Check if a position is walkable
    isWalkable(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        // Check bounds
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        
        // Check terrain type
        const terrainType = this.map[tileY][tileX];
        
        // Water is not walkable
        if (terrainType === this.WATER) {
            return false;
        }
        
        return true;
    }

    // Create Pixi graphics for terrain
    createGraphics() {
        this.container = new PIXI.Container();
        
        // If we have a loaded terrain texture, use it
        if (this.terrainTexture) {
            console.log('[Terrain] Creating sprite from loaded texture');
            const sprite = new PIXI.Sprite(this.terrainTexture);
            sprite.x = 0;
            sprite.y = 0;
            this.container.addChild(sprite);
            console.log(`[Terrain] Terrain sprite created: ${sprite.width}x${sprite.height}`);
        } else {
            // Fallback: procedural terrain generation
            console.log('[Terrain] Using procedural terrain generation');
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const tile = new PIXI.Graphics();
                    const color = this.getTerrainColor(this.map[y][x]);
                    
                    // Draw tile with slight color variation for natural look
                    const variation = (Math.random() - 0.5) * 0.1;
                    const r = ((color >> 16) & 0xff) * (1 + variation);
                    const g = ((color >> 8) & 0xff) * (1 + variation);
                    const b = (color & 0xff) * (1 + variation);
                    const finalColor = (Math.min(255, Math.max(0, r)) << 16) | 
                                       (Math.min(255, Math.max(0, g)) << 8) | 
                                       Math.min(255, Math.max(0, b));
                    
                    tile.beginFill(finalColor);
                    tile.drawRect(
                        x * this.tileSize, 
                        y * this.tileSize, 
                        this.tileSize, 
                        this.tileSize
                    );
                    tile.endFill();
                    
                    // Add subtle grid lines
                    tile.lineStyle(1, 0x000000, 0.05);
                    tile.drawRect(
                        x * this.tileSize, 
                        y * this.tileSize, 
                        this.tileSize, 
                        this.tileSize
                    );
                    
                    this.container.addChild(tile);
                }
            }
        }
        
        return this.container;
    }

    // Get pixel dimensions
    getPixelWidth() {
        return this.width * this.tileSize;
    }

    getPixelHeight() {
        return this.height * this.tileSize;
    }
}
