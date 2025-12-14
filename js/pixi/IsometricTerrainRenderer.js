// Isometric 3D Terrain Renderer - HD Texture Support
import { TerrainDecorations } from './TerrainDecorations.js';
import { TileAssetLoader } from './TileAssetLoader.js';

export class IsometricTerrainRenderer {
    constructor(terrainGenerator, tileSize = 32, assetLoader = null) {
        this.generator = terrainGenerator;
        this.tileSize = tileSize;
        this.colors = this.initializeColors();
        this.decorations = new TerrainDecorations(terrainGenerator);
        this.assetLoader = assetLoader; 
    }
    
    initializeColors() {
        return {
            water: [0x2b5c8a, 0x3d6fa1, 0x4d7fb8],
            shore: [0xc8b87d, 0xd4c294],
            grass: [0x6ba854, 0x7cbd5f, 0x8dd46a, 0x9ee675],
            cliff: [0x8b6f47, 0x9d7f57, 0xaf9167],
            mountain: [0x7a7269, 0x8a8279, 0x9a9289]
        };
    }
    
    renderToCanvas(width, height) {
        console.log('[IsometricRenderer] Rendering HD terrain...');
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Clear background
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
        
        // Prepare patterns if assets loaded
        this.preparePatterns(ctx);
        
        // Render tiles back to front
        const tiles = [];
        for (let y = 0; y < this.generator.height; y++) {
            for (let x = 0; x < this.generator.width; x++) {
                const isoPos = this.toIsometric(x, y, this.generator.getHeight(x, y));
                tiles.push({ x, y, isoX: isoPos.x, isoY: isoPos.y });
            }
        }
        
        tiles.sort((a, b) => (a.x + a.y) - (b.x + b.y));
        
        tiles.forEach(tile => {
            this.renderTile(ctx, tile.x, tile.y);
        });
        
        console.log('[IsometricRenderer] Rendering complete!');
        return canvas;
    }
    
    preparePatterns(ctx) {
        this.patterns = {};
        if (this.assetLoader && this.assetLoader.hasAssets()) {
            // Create pattern for grass
            if (this.assetLoader.tiles.grass.length > 0) {
                const img = this.assetLoader.tiles.grass[0].image;
                this.patterns.grass = ctx.createPattern(img, 'repeat');
                console.log('[IsometricRenderer] Created grass pattern');
            }
        }
    }
    
    toIsometric(x, y, height) {
        const isoX = (x - y) * (this.tileSize / 2);
        const isoY = (x + y) * (this.tileSize / 4) - (height * this.tileSize * 2);
        return { x: isoX, y: isoY };
    }
    
    renderTile(ctx, x, y) {
        const height = this.generator.getHeight(x, y);
        const terrainType = this.generator.getTerrainType(x, y);
        const slope = this.generator.getSlope(x, y);
        
        const pos = this.toIsometric(x, y, height);
        const screenX = pos.x + (ctx.canvas.width / 2);
        const screenY = pos.y + (ctx.canvas.height / 3);
        
        // Draw the diamond tile
        this.drawTile(ctx, screenX, screenY, this.tileSize / 2, terrainType, x, y);
        
        // Draw cliffs
        if (terrainType === 'cliff' || slope > this.generator.cliffThreshold) {
            this.drawCliffFaces(ctx, x, y, screenX, screenY, height);
        }
    }
    
    drawTile(ctx, centerX, centerY, size, terrainType, gridX, gridY) {
        // Draw slightly larger to cover seams (overlap)
        const overlap = 1; 
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size / 2 - overlap);
        ctx.lineTo(centerX + size + overlap, centerY);
        ctx.lineTo(centerX, centerY + size / 2 + overlap);
        ctx.lineTo(centerX - size - overlap, centerY);
        ctx.closePath();
        
        // Use HD texture pattern if available
        if (this.patterns && this.patterns[terrainType]) {
            ctx.save();
            // Offset pattern to match world position (seamless tiling)
            // We use grid coordinates to align the texture across tiles
            const patternScale = 0.5; // Scale texture to look good
            ctx.scale(patternScale, patternScale);
            // Adjust translation to account for scale
            ctx.translate(-centerX/patternScale, -centerY/patternScale); 
            ctx.fillStyle = this.patterns[terrainType];
            ctx.fill();
            ctx.restore();
        } else {
            // Fallback to colors
            const color = this.getColor(terrainType, gridX, gridY);
            ctx.fillStyle = color;
            ctx.fill();
        }
        
        // Disable border for seamless look
        // ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        // ctx.lineWidth = 1;
        // ctx.stroke();
    }
    
    drawCliffFaces(ctx, x, y, screenX, screenY, height) {
        const tileSize = this.tileSize;
        const heightRight = this.generator.getHeight(x + 1, y);
        const heightDown = this.generator.getHeight(x, y + 1);
        const cliffColorHex = this.colorToHex(this.colors.cliff[0]);
        const cliffHeight = Math.abs(height - Math.min(heightRight, heightDown)) * tileSize * 2;
        
        if (cliffHeight > 2) {
            if (height > heightRight) {
                ctx.fillStyle = cliffColorHex;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + tileSize / 2, screenY + tileSize / 4);
                ctx.lineTo(screenX + tileSize / 2, screenY + tileSize / 4 + cliffHeight);
                ctx.lineTo(screenX, screenY + cliffHeight);
                ctx.closePath();
                ctx.fill();
            }
            if (height > heightDown) {
                ctx.fillStyle = this.shadeColor(cliffColorHex, 0.8);
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX - tileSize / 2, screenY + tileSize / 4);
                ctx.lineTo(screenX - tileSize / 2, screenY + tileSize / 4 + cliffHeight);
                ctx.lineTo(screenX, screenY + cliffHeight);
                ctx.closePath();
                ctx.fill();
            }
        }
    }
    
    getColor(terrainType, x, y) {
        const colors = this.colors[terrainType] || this.colors.grass;
        const variation = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
        const index = Math.floor(variation * colors.length) % colors.length;
        const color = colors[index];
        return this.colorToHex(color || 0x00FF00);
    }
    
    colorToHex(color) {
        if (typeof color === 'number') return '#' + color.toString(16).padStart(6, '0');
        return color;
    }
    
    shadeColor(colorHex, percent) {
        const num = parseInt(colorHex.replace('#', ''), 16);
        const r = Math.floor((num >> 16) * percent);
        const g = Math.floor(((num >> 8) & 0x00FF) * percent);
        const b = Math.floor((num & 0x0000FF) * percent);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }
}
