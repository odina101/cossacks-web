# Terrain Assets Guide

## Folder Structure

Put your terrain assets in these folders:

### 📁 grass/
Place grass tile images here:
- `grass_1.png`, `grass_2.png`, `grass_3.png` (multiple variations)
- **Size**: 64x64px or 32x32px
- **Style**: Isometric view, green grass with texture detail
- **Format**: PNG with transparency (if edges visible)

### 📁 water/
Water tiles:
- `water_1.png`, `water_2.png` (variation for animation)
- **Size**: 64x64px or 32x32px
- **Style**: Blue water, isometric
- **Optional**: Multiple frames for animated water

### 📁 cliffs/
Cliff and mountain tiles:
- `cliff_top.png` - Top surface of cliff
- `cliff_face.png` - Vertical cliff wall
- `cliff_edge.png` - Cliff edge transition
- **Size**: 64x64px or taller for cliff faces
- **Style**: Brown/tan rocky texture

### 📁 shore/
Beach/shore transition tiles:
- `shore_1.png`, `shore_2.png`
- **Size**: 64x64px
- **Style**: Sandy/tan color, transitions water to grass

### 📁 decorations/trees/
Tree sprites:
- `tree_1.png`, `tree_2.png`, `tree_3.png`
- **Size**: Variable (64x128px or similar for tall trees)
- **Style**: Isometric trees with trunk and foliage
- **Format**: PNG with transparency

### 📁 decorations/rocks/
Rock sprites:
- `rock_1.png`, `rock_2.png`
- **Size**: 32x32px to 64x64px
- **Style**: Gray/brown rocks, isometric

### 📁 decorations/bushes/
Bush sprites:
- `bush_1.png`, `bush_2.png`
- **Size**: 32x32px
- **Style**: Small green bushes

### 📁 paths/
Dirt path/road tiles:
- `path_straight.png`
- `path_corner.png`
- **Size**: 64x64px
- **Style**: Brown dirt path

## Image Requirements

- **Format**: PNG (with alpha channel for transparency)
- **Perspective**: Isometric (pre-rendered at ~26.6° angle)
- **Tile Size**: Consistent (recommend 64x64px)
- **Colors**: Match Cossacks palette (greens, browns, blues)

## How Many Assets Needed?

**Minimum (Quick Start):**
- 3 grass tiles
- 2 water tiles
- 2 cliff tiles
- 2 trees
- 1 rock
- 1 bush

**Good Quality:**
- 5-10 grass variations
- 3-5 water variations
- 5-8 cliff/mountain tiles
- 5-10 trees
- 3-5 rocks
- 3-5 bushes

**Professional:**
- 20+ tiles per terrain type
- Smooth transitions
- Multiple decoration variants

## Next Steps

1. **Add your PNG files** to the appropriate folders
2. **Tell me** when assets are ready
3. **I'll build** the tile-based renderer to use them
4. **Result**: Beautiful Cossacks-quality terrain! 🎮

## Tips

- You can extract tiles from the original Cossacks game
- Or use similar RTS game assets (Age of Empires, etc.)
- Or create/commission custom artwork
- Or use AI image generation for isometric tiles
