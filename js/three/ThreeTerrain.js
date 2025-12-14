
export class ThreeTerrain {
    constructor(terrainGenerator, tileSize = 32) {
        this.generator = terrainGenerator;
        this.tileSize = tileSize;
        this.mesh = null;
        this.textures = {};
    }

    async loadTextures() {
        const loader = new THREE.TextureLoader();
        
        const loadTexture = (path) => {
            return new Promise((resolve, reject) => {
                loader.load(path, 
                    (texture) => {
                        texture.wrapS = THREE.RepeatWrapping;
                        texture.wrapT = THREE.RepeatWrapping;
                        resolve(texture);
                    },
                    undefined,
                    (err) => {
                        console.warn(`Failed to load texture: ${path}`, err);
                        resolve(null); // Resolve with null on error
                    }
                );
            });
        };

        this.textures.grass = await loadTexture('assets/terrain/grass/grass_1.png');
        this.textures.water = await loadTexture('assets/terrain/water/water_1.png');
        this.textures.cliff = await loadTexture('assets/terrain/cliffs/cliff_top_1.png');
    }

    createMesh() {
        console.log("ThreeTerrain: Creating Mesh...");
        const width = this.generator.width;
        const height = this.generator.height;
        
        // Create a much larger plane to fill the world
        const worldWidth = width * this.tileSize;
        const worldHeight = height * this.tileSize;
        
        const geometry = new THREE.PlaneGeometry(
            worldWidth, 
            worldHeight, 
            width - 1, 
            height - 1
        );

        // Update vertices based on heightmap
        const positions = geometry.attributes.position.array;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 3;
                const h = this.generator.getHeight(x, y);
                
                // Scaling height for visualization
                positions[index + 2] = h * this.tileSize * 2; 
            }
        }

        geometry.computeVertexNormals();

        // Create material with better texture scaling
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            map: this.textures.grass || null,
            side: THREE.DoubleSide
        });

        if (this.textures.grass) {
            // Better texture repeat for seamless tiling
            material.map.repeat.set(width / 2, height / 2);
        }

        this.mesh = new THREE.Mesh(geometry, material);
        
        // Rotate to be flat on ground (X-Z plane)
        this.mesh.rotation.x = -Math.PI / 2;
        
        // Position terrain so game coordinates (0,0) to (width, height) work correctly
        // Game coordinate system: (0, 0) is top-left in 2D
        // 3D coordinate system: Place terrain so game (0,0) maps to 3D (0, 0, 0)
        // Since PlaneGeometry is centered, we need to offset by half the size
        // Game X -> 3D X, Game Y -> 3D -Z
        // So position at (worldWidth/2, 0, -worldHeight/2)
        this.mesh.position.set(worldWidth / 2, 0, -worldHeight / 2);
        
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;

        console.log(`[ThreeTerrain] Mesh created: ${worldWidth}x${worldHeight}`);
        console.log(`[ThreeTerrain] Positioned at (${worldWidth/2}, 0, ${-worldHeight/2})`);
        return this.mesh;
    }
}
