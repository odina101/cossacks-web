# 🚀 Quick Start - 3D Terrain

## Test the Terrain Generator

1. **Open** `test-terrain.html` in your browser
2. **Click** "Generate New Terrain" button
3. **See** beautiful 3D isometric Cossacks-style terrain!

## What You'll See

- 🟩 **Green grass** plains with natural variation
- 🟦 **Blue water** bodies in low areas
- 🟫 **Brown cliffs** on steep slopes
- 🌳 **Trees** scattered on grass
- 🪨 **Rocks** on mountains and cliffs
- 🌿 **Bushes** adding detail

## Run the Full Game

1. **Open** `index.html` in your browser
2. **Wait** for terrain generation (shows in console)
3. **Play** with your units on procedurally generated terrain!

## Change the Terrain

Edit `js/pixi/main.js` line ~47:

```javascript
const seed = Date.now();  // Random terrain each time
// OR
const seed = 12345;  // Same terrain every time
```

## Customize

### More Water
Edit `js/pixi/TerrainGenerator.js` line 11:
```javascript
this.waterLevel = 0.4;  // Default: 0.3 (higher = more water)
```

### More Trees
Edit `js/pixi/TerrainDecorations.js` line 17:
```javascript
this.generateTrees(300);  // Default: 150
```

### Bigger Map
Edit `js/pixi/main.js` line ~10:
```javascript
WORLD_WIDTH: 4096,   // Default: 2048
WORLD_HEIGHT: 4096,  // Default: 2048
```

---

**Enjoy your Cossacks-style terrain! 🎮⚔️**
