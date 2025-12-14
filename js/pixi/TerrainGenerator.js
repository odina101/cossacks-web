// 3D Heightmap Terrain Generator - Cossacks Style
export class TerrainGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.heightmap = [];
        this.waterLevel = 0.3;
        this.cliffThreshold = 0.15; // Steep slope = cliff
    }
    
    /**
     * Generate heightmap using Perlin-style noise
     */
    generate(seed = Math.random()) {
        console.log('[TerrainGenerator] Generating heightmap...');
        
        // Initialize heightmap
        this.heightmap = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
        
        // Multi-octave noise for natural terrain
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                let height = 0;
                let amplitude = 1;
                let frequency = 1;
                
                // Combine multiple noise octaves
                for (let octave = 0; octave < 6; octave++) {
                    height += this.noise(
                        x * frequency * 0.02, 
                        y * frequency * 0.02, 
                        seed + octave
                    ) * amplitude;
                    
                    amplitude *= 0.5;
                    frequency *= 2;
                }
                
                // Normalize to 0-1 range
                this.heightmap[y][x] = (height + 1) / 2;
            }
        }
        
        // Smooth the heightmap
        this.smooth(2);
        
        // Add some plateaus and valleys
        this.addFeatures();
        
        console.log('[TerrainGenerator] Heightmap generated!');
        return this.heightmap;
    }
    
    /**
     * Simple 2D Perlin-style noise
     */
    noise(x, y, seed) {
        // Pseudo-random gradient based on coordinates
        const random = (x, y, s) => {
            const n = Math.sin(x * 12.9898 + y * 78.233 + s * 43758.5453) * 43758.5453;
            return n - Math.floor(n);
        };
        
        const x0 = Math.floor(x);
        const x1 = x0 + 1;
        const y0 = Math.floor(y);
        const y1 = y0 + 1;
        
        const sx = x - x0;
        const sy = y - y0;
        
        // Smoothstep interpolation
        const smooth = t => t * t * (3 - 2 * t);
        const fx = smooth(sx);
        const fy = smooth(sy);
        
        // Get corner values
        const n00 = random(x0, y0, seed);
        const n10 = random(x1, y0, seed);
        const n01 = random(x0, y1, seed);
        const n11 = random(x1, y1, seed);
        
        // Interpolate
        const nx0 = n00 * (1 - fx) + n10 * fx;
        const nx1 = n01 * (1 - fx) + n11 * fx;
        
        return nx0 * (1 - fy) + nx1 * fy * 2 - 1; // Range: -1 to 1
    }
    
    /**
     * Smooth heightmap to reduce harsh transitions
     */
    smooth(iterations = 1) {
        for (let iter = 0; iter < iterations; iter++) {
            const newHeightmap = Array(this.height).fill(0).map(() => Array(this.width).fill(0));
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    let sum = 0;
                    let count = 0;
                    
                    // Average with neighbors
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            
                            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                                sum += this.heightmap[ny][nx];
                                count++;
                            }
                        }
                    }
                    
                    newHeightmap[y][x] = sum / count;
                }
            }
            
            this.heightmap = newHeightmap;
        }
    }
    
    /**
     * Add terrain features (plateaus, valleys)
     */
    addFeatures() {
        // Add some random plateaus
        const numPlateaus = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numPlateaus; i++) {
            const cx = Math.floor(Math.random() * this.width);
            const cy = Math.floor(Math.random() * this.height);
            const radius = 10 + Math.floor(Math.random() * 20);
            const height = 0.6 + Math.random() * 0.3;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < radius) {
                        const influence = 1 - (dist / radius);
                        this.heightmap[y][x] = this.heightmap[y][x] * (1 - influence) + height * influence;
                    }
                }
            }
        }
        
        // Add some water bodies (lower areas)
        const numWaterBodies = 2 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numWaterBodies; i++) {
            const cx = Math.floor(Math.random() * this.width);
            const cy = Math.floor(Math.random() * this.height);
            const radius = 8 + Math.floor(Math.random() * 15);
            const depth = 0.1 + Math.random() * 0.15;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < radius) {
                        const influence = 1 - (dist / radius);
                        this.heightmap[y][x] = this.heightmap[y][x] * (1 - influence) + depth * influence;
                    }
                }
            }
        }
    }
    
    /**
     * Get terrain type at position based on height and slope
     */
    getTerrainType(x, y) {
        const height = this.heightmap[y][x];
        const slope = this.getSlope(x, y);
        
        if (height < this.waterLevel) {
            return 'water';
        } else if (height < this.waterLevel + 0.05) {
            return 'shore';
        } else if (slope > this.cliffThreshold) {
            return 'cliff';
        } else if (height > 0.7) {
            return 'mountain';
        } else {
            return 'grass';
        }
    }
    
    /**
     * Calculate slope at position
     */
    getSlope(x, y) {
        if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
            return 0;
        }
        
        const h = this.heightmap[y][x];
        const hRight = this.heightmap[y][x + 1];
        const hDown = this.heightmap[y + 1][x];
        
        const slopeX = Math.abs(hRight - h);
        const slopeY = Math.abs(hDown - h);
        
        return Math.max(slopeX, slopeY);
    }
    
    /**
     * Get height at position
     */
    getHeight(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0;
        }
        return this.heightmap[y][x];
    }
}
