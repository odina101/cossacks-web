// Main entry point for Three.js version - RTS Style
import { World } from './World.js?v=3';
import { Unit } from './Unit.js?v=13';
import { UnitState } from './UnitState.js';
import { ThreeRender } from '../three/ThreeRender.js?v=7';
// import { MinimapRender } from './MinimapRender.js';
import { Terrain } from './Terrain.js';
import { Pathfinding } from './Pathfinding.js';

// Configuration - fullscreen RTS style
const CONFIG = {
    SHOW_DEBUG_INFO: true,
    MINIMAP_WIDTH: 200,
    MINIMAP_HEIGHT: 150,
    WORLD_WIDTH: 2048,
    WORLD_HEIGHT: 2048,
    TILE_SIZE: 32
};

async function init() {
    const loadingContainer = document.getElementById('loading-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const startTime = Date.now();

    const log = (msg) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        if (loadingContainer) {
            loadingContainer.innerHTML += `[${elapsed}s] ${msg}<br>`;
            loadingContainer.scrollTop = loadingContainer.scrollHeight;
        }
        console.log(`[${elapsed}s] ${msg}`);
    };

    log('Initializing game (Three.js Version)...');
    console.log("THREE.JS MAIN STARTING");
    // alert("Three.js Version Starting"); // Uncomment for hard debug
    
    // Get actual window size for fullscreen
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;
    log(`Screen size: ${gameWidth}x${gameHeight}`);

    // Create terrain
    const terrainWidth = Math.floor(CONFIG.WORLD_WIDTH / CONFIG.TILE_SIZE);
    const terrainHeight = Math.floor(CONFIG.WORLD_HEIGHT / CONFIG.TILE_SIZE);
    const terrain = new Terrain(terrainWidth, terrainHeight, CONFIG.TILE_SIZE);
    
    // Generate 3D isometric terrain (Cossacks style)
    log('Generating 3D isometric terrain...');
    const seed = Date.now(); // Random seed
    await terrain.generate3DTerrain(seed);
    log(`3D terrain generated: ${terrain.width}x${terrain.height} tiles with heightmap`);

    // Create pathfinder
    const pathfinder = new Pathfinding(terrain);
    
    // Create world with terrain size
    const world = new World(terrain.getPixelWidth(), terrain.getPixelHeight());
    world.terrain = terrain;
    world.pathfinder = pathfinder;
    world.buildings = [];
    
    // Create soldier unit at center of world
    const soldier = new Unit('Soldier');
    soldier.x = CONFIG.WORLD_WIDTH / 2;  // 1024
    soldier.y = CONFIG.WORLD_HEIGHT / 2; // 1024
    soldier.IsSelected = true; // Start selected so right-click works immediately
    world.units.push(soldier);
    
    console.log('Created soldier at:', soldier.x, soldier.y);

    // Check sprites
    if (!window.sprites || !window.sprites.length) {
        log('ERROR: No sprites loaded');
        return;
    }
    log(`Found ${window.sprites.length} sprite definitions`);

    // Group sprites by character
    const characterGroups = {};
    for (const spriteData of window.sprites) {
        const charName = spriteData.UnitName.substring(0, 3);
        const animType = spriteData.UnitName.substring(3);
        
        if (!characterGroups[charName]) {
            characterGroups[charName] = {
                name: charName,
                animations: {}
            };
        }
        characterGroups[charName].animations[animType] = spriteData;
    }
    
    window.characterGroups = characterGroups;
    const characterNames = Object.keys(characterGroups);
    log(`Found ${characterNames.length} characters: ${characterNames.join(', ')}`);

    // Load all sprite data as unit states
    for (let i = 0; i < window.sprites.length; i++) {
        const spriteData = window.sprites[i];
        const unitState = new UnitState(
            spriteData.UnitName,
            spriteData.SpriteHeight,
            spriteData.SpriteWidth,
            spriteData.NumberOfFrames,
            spriteData.Id,
            spriteData.XSymmetry,
            spriteData.YSymmetry
        );
        soldier.states.push(unitState);
    }

    // Set default character
    const defaultChar = 'KOF';
    const defaultAnim = 'G';
    const defaultIndex = window.sprites.findIndex(s => s.UnitName === defaultChar + defaultAnim);
    soldier.SetState(defaultIndex >= 0 ? defaultIndex : 0);
    soldier.currentCharacter = defaultChar;
    log('Unit initialized');

    // Create Three.js renderer - fullscreen
    const render = new ThreeRender({
        world: world,
        width: gameWidth,
        height: gameHeight - 30, // Account for top panel
        containerId: 'fieldContainer'
    });

    log('Loading sprites and terrain...');
    await render.init((progress) => {
        // Progress callback
    });
    log('Assets loaded!');

    // Create minimap - DISABLED FOR THREE.JS MIGRATION
    /*
    const minimapRender = new MinimapRender({
        render: render,
        world: world,
        width: CONFIG.MINIMAP_WIDTH,
        height: CONFIG.MINIMAP_HEIGHT,
        containerId: 'minimapContainer'
    });
    minimapRender.init();
    */

    // Start the world simulation
    world.Run();

    // Center view on unit (handled by Camera in ThreeRender)
    // render.canvasOffsetX = soldier.x - render.canvas_width / 2;
    // render.canvasOffsetY = soldier.y - render.canvas_height / 2;
    // Set Camera target
    render.target.set(soldier.x, 0, -soldier.y);
    render.updateCamera();
    
    console.log('Initial setup:');
    console.log('  Unit position:', soldier.x, soldier.y);
    // console.log('  Canvas size:', render.canvas_width, render.canvas_height);
    // console.log('  Camera offset:', render.canvasOffsetX, render.canvasOffsetY);
    console.log('  Unit should appear at screen center');

    // Expose to global scope
    window.render = render;
    window.unit = soldier;
    window.world = world;
    window.pathfinder = pathfinder;

    // Setup character selector
    const charSelector = document.getElementById('char-selector');
    const animSelector = document.getElementById('anim-selector');
    
    const updateAnimSelector = (charName) => {
        if (!animSelector || !characterGroups[charName]) return;
        
        const animations = characterGroups[charName].animations;
        const animTypes = Object.keys(animations);
        
        animSelector.innerHTML = animTypes.map(animType => 
            `<option value="${animType}">${animType}</option>`
        ).join('');
        
        if (animTypes.length > 0) {
            const spriteName = charName + animTypes[0];
            const stateIndex = window.sprites.findIndex(s => s.UnitName === spriteName);
            if (stateIndex >= 0) {
                window.unit.SetState(stateIndex);
                window.unit.currentCharacter = charName;
            }
        }
    };
    
    if (charSelector) {
        charSelector.innerHTML = characterNames.map(charName => 
            `<option value="${charName}" ${charName === defaultChar ? 'selected' : ''}>${charName}</option>`
        ).join('');

        charSelector.addEventListener('change', (e) => {
            updateAnimSelector(e.target.value);
        });
        
        updateAnimSelector(defaultChar);
    }
    
    if (animSelector) {
        animSelector.addEventListener('change', (e) => {
            const animType = e.target.value;
            const charName = window.unit.currentCharacter || defaultChar;
            const spriteName = charName + animType;
            const stateIndex = window.sprites.findIndex(s => s.UnitName === spriteName);
            
            if (stateIndex >= 0) {
                window.unit.SetState(stateIndex);
            }
        });
    }

    // Start units handler
    window.startUnits = () => {
        for (let i = 0; i < 16; i++) {
            soldier.go(i);
        }
    };

    // Building selector
    const buildingSelector = document.getElementById('building-selector');
    if (buildingSelector && window.buildings) {
        buildingSelector.innerHTML = '<option value="">Build</option>' + 
            window.buildings.map(b => 
                `<option value="${b.Name}">${b.Name}</option>`
            ).join('');
    }

    window.selectedBuilding = null;
    if (buildingSelector) {
        buildingSelector.addEventListener('change', (e) => {
            window.selectedBuilding = e.target.value || null;
        });
    }

    // Input handling is now managed by ThreeRender.js
    // We can rely on render.setupInput() which is called in render.init()

    // Hide loading overlay
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
    log('Game ready!');
    
    // Update debug info
    if (CONFIG.SHOW_DEBUG_INFO) {
        setInterval(() => {
            const worldInfo = document.getElementById('world-info');
            const unitInfo = document.getElementById('unit-info');
            const directionInfo = document.getElementById('direction-info');
            const vectorInfo = document.getElementById('vector-info');
            
            if (worldInfo) worldInfo.textContent = `Units: ${world.units.length} | Tick: ${world.TimeQuantumNumber}`;
            if (unitInfo) unitInfo.textContent = `X: ${Math.round(soldier.x)} Y: ${Math.round(soldier.y)}`;
            
            if (directionInfo) {
                directionInfo.textContent = `Dir: ${soldier.n} | Moving: ${soldier.isMoving ? 'Yes' : 'No'} | Anim: ${soldier.State.spriteName || 'N/A'}`;
            }
            
            if (vectorInfo && soldier.isMoving && soldier.path && soldier.pathIndex < soldier.path.length) {
                const target = soldier.path[soldier.pathIndex];
                const dx = target.x - soldier.x;
                const dy = target.y - soldier.y;
                vectorInfo.textContent = `dx: ${dx.toFixed(1)}, dy: ${dy.toFixed(1)} | Target: (${Math.round(target.x)}, ${Math.round(target.y)})`;
            } else if (vectorInfo) {
                vectorInfo.textContent = 'Not moving';
            }
        }, 100);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        // Handled by ThreeRender
    });
}

// Start the application
init().catch(err => {
    console.error(err);
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.innerHTML += `<span style="color:red">ERROR: ${err.message}</span>`;
    }
});
