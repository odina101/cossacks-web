
import { ThreeTerrain } from './ThreeTerrain.js?v=4';

export class ThreeRender {
    constructor(options) {
        this.world = options.world;
        this.width = options.width;
        this.height = options.height;
        this.containerId = options.containerId;
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.unitSprites = new Map(); // unit -> { sprite, material }
        this.textures = {}; // cache
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Camera controls - Better isometric angle
        // Position relative to world center (1024, 1024 in game coords = 1024, 0, -1024 in 3D)
        this.cameraOffset = new THREE.Vector3(0, 800, 800);
        this.target = new THREE.Vector3(1024, 0, -1024); // Center of 2048x2048 world
    }

    async init(progressCallback) {
        // Init Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 1000, 4000);

        // Camera
        const aspect = this.width / this.height;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 10, 10000);
        this.camera.position.copy(this.cameraOffset);
        this.camera.lookAt(this.target);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.shadowMap.enabled = true;
        
        const container = document.getElementById(this.containerId);
        container.innerHTML = ''; // Clear existing
        container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Debug Box - position at world center
        const debugGeo = new THREE.BoxGeometry(100, 100, 100);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const debugMesh = new THREE.Mesh(debugGeo, debugMat);
        debugMesh.position.set(1024, 50, -1024); // World center
        this.scene.add(debugMesh);
        console.log("Debug Box Added at World Center (1024, 50, -1024)");

        // Terrain
        if (this.world.terrain && this.world.terrain.terrainGenerator) {
            console.log('[ThreeRender] Creating 3D Terrain...');
            this.terrain = new ThreeTerrain(this.world.terrain.terrainGenerator);
            await this.terrain.loadTextures();
            const terrainMesh = this.terrain.createMesh();
            this.scene.add(terrainMesh);
            console.log('[ThreeRender] Terrain added.');
        } else {
            console.warn('[ThreeRender] No terrain generator found!');
        }

        // Load Sprites
        await this.loadTextures(progressCallback);

        // Input
        this.setupInput();

        // Start Loop
        this.animate();
    }

    async loadTextures(progressCallback) {
        const loader = new THREE.TextureLoader();
        const spritesToLoad = window.sprites || [];
        const buildingsToLoad = window.buildings || [];
        const total = spritesToLoad.length + buildingsToLoad.length;
        let loaded = 0;

        const loadFile = async (name, url) => {
            try {
                const tex = await new Promise((resolve) => loader.load(url, resolve, undefined, () => resolve(null)));
                if (tex) {
                    tex.encoding = THREE.sRGBEncoding;
                    this.textures[name] = tex;
                }
            } catch (e) { console.warn(e); }
            loaded++;
            if (progressCallback) progressCallback(loaded / total);
        };

        for (const s of spritesToLoad) {
            await loadFile(s.UnitName, `sprites_png/${s.UnitName}/${s.UnitName}.png`);
        }
        
        for (const b of buildingsToLoad) {
            await loadFile(b.Name, `sprites_png/${b.Name}/${b.Name}.png`);
        }
    }

    renderBuildings() {
        const buildings = this.world.buildings || [];
        for (const b of buildings) {
            if (!b.threeSprite) {
                const tex = this.textures[b.type];
                if (tex) {
                    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xffffff });
                    const sprite = new THREE.Sprite(mat);
                    sprite.center.set(0.5, 0.9); // Anchor bottom-ish
                    
                    // Scale?
                    if (tex.image) {
                        sprite.scale.set(tex.image.width, tex.image.height, 1);
                    }
                    
                    this.scene.add(sprite);
                    b.threeSprite = sprite;
                }
            }
            
            if (b.threeSprite) {
                const x = b.x;
                const z = -b.y;
                let y = 0;
                if (this.terrain && this.terrain.generator) {
                    const tx = Math.floor(b.x / 32);
                    const ty = Math.floor(b.y / 32);
                    y = this.terrain.generator.getHeight(tx, ty) * 32 * 2;
                }
                b.threeSprite.position.set(x, y, z);
            }
        }
    }

    setupInput() {
        const canvas = this.renderer.domElement;
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });

        // Mouse interaction - prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        
        // Keyboard (Camera move)
        document.addEventListener('keydown', (e) => {
            const speed = 20;
            switch(e.key) {
                case 'ArrowLeft': this.target.x -= speed; break;
                case 'ArrowRight': this.target.x += speed; break;
                case 'ArrowUp': this.target.z -= speed; break; // Z is Forward
                case 'ArrowDown': this.target.z += speed; break;
            }
            this.updateCamera();
        });
    }

    onMouseDown(e) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Raycast against terrain
        if (!this.terrain || !this.terrain.mesh) return;

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hit = intersects.find(i => i.object === this.terrain.mesh); // Only terrain for movement

        if (hit) {
            const worldX = hit.point.x;
            const worldZ = hit.point.z;
            
            // Coordinate mapping for rotated plane:
            // When plane is rotated -90° on X axis:
            // - World X = Game X (no change)
            // - World Z = -Game Y (Z points "forward" which is -Y in game)
            // So: Game Y = -World Z
            
            const gameX = worldX;
            const gameY = -worldZ; 

            console.log(`Click at 3D: (${worldX.toFixed(1)}, ${worldZ.toFixed(1)}) -> Game: (${gameX.toFixed(1)}, ${gameY.toFixed(1)})`);

            if (e.button === 2) { // Right Click - Move
                e.preventDefault();
                const selected = this.world.units.filter(u => u.IsSelected);
                if (selected.length > 0) {
                    selected.forEach(u => u.moveTo(gameX, gameY, this.world.pathfinder));
                } else if (this.world.units.length > 0) {
                    this.world.units[0].moveTo(gameX, gameY, this.world.pathfinder);
                }
            } else { // Left Click - Select
                // Simple distance check in 2D logic
                let hitUnit = false;
                for (const u of this.world.units) {
                    const dist = Math.sqrt(Math.pow(u.x - gameX, 2) + Math.pow(u.y - gameY, 2));
                    if (dist < 32) {
                        u.IsSelected = true;
                        hitUnit = true;
                        console.log('Selected:', u.name);
                    } else {
                        u.IsSelected = false;
                    }
                }
            }
        }
    }

    updateCamera() {
        this.camera.position.x = this.target.x + this.cameraOffset.x;
        this.camera.position.y = this.target.y + this.cameraOffset.y;
        this.camera.position.z = this.target.z + this.cameraOffset.z;
        this.camera.lookAt(this.target);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderBuildings();
        this.renderUnits();
        this.renderer.render(this.scene, this.camera);
    }

    renderUnits() {
        for (const unit of this.world.units) {
            let entry = this.unitSprites.get(unit);
            
            if (!entry) {
                // Create Sprite
                const mat = new THREE.SpriteMaterial({ color: 0xffffff });
                const sprite = new THREE.Sprite(mat);
                sprite.center.set(0.5, 0); // Bottom center
                this.scene.add(sprite);
                
                entry = { sprite, material: mat, currentTex: null };
                this.unitSprites.set(unit, entry);
            }

            // Update Texture
            const state = unit.State;
            const tex = this.textures[state.spriteName];
            if (tex) {
                if (entry.currentTex !== tex) {
                    entry.material.map = tex;
                    entry.currentTex = tex;
                }
                
                // Set UVs for sprite sheet
                const cols = 1; // Need to know columns? No, sprite data has XSymmetry etc?
                // Pixi Render uses:
                // sx = spriteWidth * direction
                // sy = spriteHeight * frameIndex
                // We need full texture size to normalize UV.
                // tex.image.width/height
                
                if (tex.image) {
                    const w = tex.image.width;
                    const h = tex.image.height;
                    const sw = state.spriteWidth;
                    const sh = state.spriteHeight;
                    
                    // Validate and clamp direction to valid range (0-15)
                    let direction = unit.n;
                    if (isNaN(direction) || direction < 0 || direction > 15) {
                        console.error(`[ThreeRender] Invalid unit direction: ${direction}, clamping to 0`);
                        direction = 0;
                        unit.n = 0;
                    }
                    
                    // Transform Logical Direction (Y-Up) to Sprite Direction (Y-Down)
                    // The 3D world maps Game Y+ to World Z- (North/Up on screen)
                    // But Sprites assume Y+ is South/Down
                    // We reflect across X-axis: 
                    // N=0 (North) -> Sprite 8 (North)
                    // N=8 (South) -> Sprite 0 (South)
                    // N=4 (West)  -> Sprite 4 (West)
                    // N=12 (East) -> Sprite 12 (East)
                    // Formula: (24 - direction) % 16
                    const visualDirection = (24 - direction) % 16;
                    
                    const sx = sw * visualDirection;
                    const sy = sh * state.j; // Frame index
                    
                    // Offset: (sx/w, 1 - (sy + sh)/h) ? ThreeJS UVs start bottom-left usually
                    // TextureLoader flips Y by default? No, it usually doesn't unless flipY=true.
                    // If not flipped: (0,1) is Top-Left? No (0,1) is Top-Left in WebGL IF loaded that way.
                    // Usually (0,0) is Bottom-Left.
                    // Pixi coordinates are Top-Left origin.
                    
                    // Let's assume standard UV: (0,0) Bottom-Left.
                    // We want row `sy` from Top.
                    // v_top = 1 - (sy / h)
                    // v_bottom = 1 - ((sy + sh) / h)
                    
                    entry.material.map.offset.set(sx / w, 1 - (sy + sh) / h);
                    entry.material.map.repeat.set(sw / w, sh / h);
                    
                    // Scale sprite to match pixels
                    entry.sprite.scale.set(sw, sh, 1);
                }
            }

            // Update Position
            // Game coordinates to 3D world coordinates:
            // Game (X, Y) -> 3D (X, 0, -Y)
            // The terrain is on the XZ plane after rotation
            
            const x = unit.x;
            const z = -unit.y;  // Game Y becomes -Z in 3D world
            let y = 10; // Slight elevation above terrain
            
            if (this.terrain && this.terrain.generator) {
                const tx = Math.floor(unit.x / this.terrain.tileSize);
                const ty = Math.floor(unit.y / this.terrain.tileSize);
                
                // Clamp to terrain bounds
                if (tx >= 0 && tx < this.terrain.generator.width && 
                    ty >= 0 && ty < this.terrain.generator.height) {
                    const h = this.terrain.generator.getHeight(tx, ty);
                    y = h * this.terrain.tileSize * 2 + 10; // Add offset above terrain
                }
            }

            entry.sprite.position.set(x, y, z);
            
            // Selection ring? (TODO)
            if (unit.IsSelected) {
                entry.material.color.set(0x00ff00);
            } else {
                entry.material.color.set(0xffffff);
            }
        }
    }
}
