// Terrain Decorations - Trees, Rocks, Bushes (Cossacks style)
export class TerrainDecorations {
    constructor(terrainGenerator) {
        this.generator = terrainGenerator;
        this.decorations = [];
    }
    
    /**
     * Generate decorative objects (trees, rocks, bushes)
     */
    generate() {
        console.log('[Decorations] Generating trees, rocks, and bushes...');
        
        this.decorations = [];
        
        // Generate trees on grass areas
        this.generateTrees(150); // Number of trees
        
        // Generate rocks on cliffs and mountains
        this.generateRocks(80);
        
        // Generate bushes
        this.generateBushes(100);
        
        console.log(`[Decorations] Generated ${this.decorations.length} decorative objects`);
        return this.decorations;
    }
    
    generateTrees(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * this.generator.width);
            const y = Math.floor(Math.random() * this.generator.height);
            
            const terrainType = this.generator.getTerrainType(x, y);
            
            // Trees only on grass
            if (terrainType === 'grass' || terrainType === 'shore') {
                this.decorations.push({
                    type: 'tree',
                    x: x,
                    y: y,
                    height: this.generator.getHeight(x, y),
                    variant: Math.floor(Math.random() * 3) // 3 tree variants
                });
            }
        }
    }
    
    generateRocks(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * this.generator.width);
            const y = Math.floor(Math.random() * this.generator.height);
            
            const terrainType = this.generator.getTerrainType(x, y);
            
            // Rocks on cliffs and mountains
            if (terrainType === 'cliff' || terrainType === 'mountain' || terrainType === 'grass') {
                this.decorations.push({
                    type: 'rock',
                    x: x,
                    y: y,
                    height: this.generator.getHeight(x, y),
                    size: Math.random() * 0.5 + 0.5 // Size variation
                });
            }
        }
    }
    
    generateBushes(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.floor(Math.random() * this.generator.width);
            const y = Math.floor(Math.random() * this.generator.height);
            
            const terrainType = this.generator.getTerrainType(x, y);
            
            // Bushes on grass
            if (terrainType === 'grass') {
                this.decorations.push({
                    type: 'bush',
                    x: x,
                    y: y,
                    height: this.generator.getHeight(x, y),
                    variant: Math.floor(Math.random() * 2)
                });
            }
        }
    }
    
    /**
     * Render decorations on canvas
     */
    renderToCanvas(ctx, tileSize) {
        // Sort by depth (back to front)
        const sorted = [...this.decorations].sort((a, b) => 
            (a.x + a.y) - (b.x + b.y)
        );
        
        sorted.forEach(deco => {
            const isoPos = this.toIsometric(deco.x, deco.y, deco.height, tileSize);
            const screenX = isoPos.x + (ctx.canvas.width / 2);
            const screenY = isoPos.y + (ctx.canvas.height / 3);
            
            switch (deco.type) {
                case 'tree':
                    this.drawTree(ctx, screenX, screenY, deco.variant);
                    break;
                case 'rock':
                    this.drawRock(ctx, screenX, screenY, deco.size);
                    break;
                case 'bush':
                    this.drawBush(ctx, screenX, screenY, deco.variant);
                    break;
            }
        });
    }
    
    toIsometric(x, y, height, tileSize) {
        const isoX = (x - y) * (tileSize / 2);
        const isoY = (x + y) * (tileSize / 4) - (height * tileSize * 2);
        return { x: isoX, y: isoY };
    }
    
    /**
     * Draw a tree
     */
    drawTree(ctx, x, y, variant) {
        // Tree trunk
        ctx.fillStyle = '#5d4e37';
        ctx.fillRect(x - 2, y - 8, 4, 16);
        
        // Tree foliage (different greens)
        const foliageColors = ['#2d5016', '#3d6b23', '#4d7c2f'];
        ctx.fillStyle = foliageColors[variant % foliageColors.length];
        
        // Draw circular foliage
        ctx.beginPath();
        ctx.arc(x, y - 12, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = 'rgba(150, 200, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(x - 2, y - 14, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Draw a rock
     */
    drawRock(ctx, x, y, size) {
        ctx.fillStyle = '#6b6b6b';
        
        // Draw irregular rock shape
        ctx.beginPath();
        ctx.moveTo(x, y - 4 * size);
        ctx.lineTo(x + 6 * size, y);
        ctx.lineTo(x + 3 * size, y + 4 * size);
        ctx.lineTo(x - 3 * size, y + 3 * size);
        ctx.lineTo(x - 5 * size, y - 1 * size);
        ctx.closePath();
        ctx.fill();
        
        // Add highlight
        ctx.fillStyle = '#8b8b8b';
        ctx.beginPath();
        ctx.moveTo(x - 2 * size, y - 2 * size);
        ctx.lineTo(x + 1 * size, y - 3 * size);
        ctx.lineTo(x + 2 * size, y);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Draw a bush
     */
    drawBush(ctx, x, y, variant) {
        const bushColors = ['#4a7c2f', '#5a8c3f'];
        ctx.fillStyle = bushColors[variant % bushColors.length];
        
        // Draw small rounded bush
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x + 3, y - 1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x - 2, y - 1, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
