// Tile Asset Loader - Loads terrain tile images
export class TileAssetLoader {
    constructor(basePath = '../assets/terrain/') {
        this.basePath = basePath;
        this.tiles = {
            grass: [],
            water: [],
            shore: [],
            cliffs: [],
            mountain: [],
            trees: [],
            rocks: [],
            bushes: []
        };
        this.loaded = false;
    }
    
    /**
     * Load all available terrain assets
     */
    async loadAssets() {
        console.log('[TileAssetLoader] Loading terrain assets...');
        
        const loadPromises = [];
        
        // Load grass tiles (HD textures)
        // Try loading base textures first
        loadPromises.push(this.loadTileSet('grass', 'grass_base', 5));
        // Fallback to old tiles if needed
        loadPromises.push(this.loadTileSet('grass', 'grass', 10));
        
        // Load water tiles
        loadPromises.push(this.loadTileSet('water', 'water', 5));
        
        // Load shore tiles
        loadPromises.push(this.loadTileSet('shore', 'shore', 5));
        
        // Load cliff tiles
        loadPromises.push(this.loadTileSet('cliffs', 'cliffs', 5));
        
        // Load decorations
        loadPromises.push(this.loadTileSet('decorations/trees', 'trees', 10));
        loadPromises.push(this.loadTileSet('decorations/rocks', 'rocks', 10));
        loadPromises.push(this.loadTileSet('decorations/bushes', 'bushes', 10));
        
        await Promise.all(loadPromises);
        
        this.loaded = true;
        
        // Log what was loaded
        console.log('[TileAssetLoader] Assets loaded:');
        console.log(`  Grass tiles: ${this.tiles.grass.length}`);
        console.log(`  Water tiles: ${this.tiles.water.length}`);
        console.log(`  Shore tiles: ${this.tiles.shore.length}`);
        console.log(`  Cliff tiles: ${this.tiles.cliffs.length}`);
        console.log(`  Trees: ${this.tiles.trees.length}`);
        console.log(`  Rocks: ${this.tiles.rocks.length}`);
        console.log(`  Bushes: ${this.tiles.bushes.length}`);
        
        return this.tiles;
    }
    
    /**
     * Load a set of tiles (tries to load {name}_1.png, {name}_2.png, etc.)
     */
    async loadTileSet(folder, category, maxCount) {
        const tiles = [];
        
        for (let i = 1; i <= maxCount; i++) {
            const filename = `${category.split('/').pop()}_${i}.png`;
            const path = `${this.basePath}${folder}/${filename}`;
            
            try {
                const img = await this.loadImage(path);
                tiles.push({
                    image: img,
                    width: img.width,
                    height: img.height,
                    path: path
                });
            } catch (error) {
                // File doesn't exist or failed to load - stop trying
                if (i === 1) {
                    console.log(`[TileAssetLoader] No ${category} assets found (tried ${path})`);
                }
                break;
            }
        }
        
        if (tiles.length > 0) {
            // If loading base textures, store them separately or merge?
            // For now, just add them to the list
            if (category.includes('base')) {
                const baseCategory = category.split('_')[0]; // 'grass_base' -> 'grass'
                if (!this.tiles[baseCategory]) this.tiles[baseCategory] = [];
                this.tiles[baseCategory] = tiles; // Prefer base textures
            } else {
                this.tiles[category.split('/').pop()] = tiles;
            }
            console.log(`[TileAssetLoader] Loaded ${tiles.length} ${category} tiles`);
        }
        
        return tiles;
    }
    
    /**
     * Load a single image
     */
    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load: ${path}`));
            img.src = path;
        });
    }
    
    /**
     * Get random tile of a type
     */
    getRandomTile(type) {
        const tileSet = this.tiles[type];
        if (!tileSet || tileSet.length === 0) {
            return null;
        }
        
        const index = Math.floor(Math.random() * tileSet.length);
        return tileSet[index];
    }
    
    /**
     * Get tile with deterministic selection (based on position)
     * Creates natural patches of similar tiles using Perlin-like noise
     */
    getTile(type, x, y) {
        const tileSet = this.tiles[type];
        if (!tileSet || tileSet.length === 0) {
            return null;
        }
        
        // Use low-frequency noise for patchiness
        const noise = Math.sin(x * 0.1) + Math.cos(y * 0.1);
        
        // Map noise (-2 to 2) to tile index
        // This groups similar tiles together in patches
        const normalized = (noise + 2) / 4; // 0 to 1
        const index = Math.floor(normalized * tileSet.length * 0.99);
        
        return tileSet[index];
    }
    
    /**
     * Check if assets are loaded
     */
    hasAssets() {
        return this.tiles.grass.length > 0 || 
               this.tiles.water.length > 0 ||
               this.tiles.trees.length > 0;
    }
}
