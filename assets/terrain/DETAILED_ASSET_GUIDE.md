# 🎨 Professional Cossacks Terrain Asset Guide

## 🎯 The Goal
To recreate the lush, detailed, and high-quality terrain of the original Cossacks game. We are moving away from small, repetitive tiles to **large, hand-painted texture assets**.

---

## 📂 Asset Structure

Create this folder structure in your project:

```
assets/terrain/
├── grass/          # High-res grass textures
├── water/          # Animated water frames
├── cliffs/         # Directional cliff faces
├── shore/          # Shoreline transitions
├── decorations/    # Trees, rocks, bushes
│   ├── trees/
│   ├── rocks/
│   └── bushes/
└── overlays/       # Detail textures (dirt paths, stones)
```

---

## 1. 🌿 Grass Assets (The Foundation)

**Requirement:** Large, seamless textures, not tiny tiles.

| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `grass_base_1.png` | 256×128 | Main green grass loop (seamless) |
| `grass_base_2.png` | 256×128 | Slightly darker variation |
| `grass_base_3.png` | 256×128 | Slightly lighter/dryer variation |
| `grass_patch_1.png` | 128×64 | Detailed grass patch with flowers/weeds |
| `grass_patch_2.png` | 128×64 | Rough grass patch |

**Art Style:**
- **Realistic painting style** (not pixel art)
- **Soft noise** texture (no harsh patterns)
- **Color Palette:** Rich forest greens (#4a7c2f to #6ba854)

---

## 2. 🌊 Water Assets (The Beauty)

**Requirement:** Animated, semi-transparent, reflective.

| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `water_calm_01.png` | 128×64 | Frame 1 of calm water animation |
| `water_calm_02.png` | 128×64 | Frame 2 |
| `water_calm_03.png` | 128×64 | Frame 3 |
| `water_deep.png` | 128×64 | Dark blue opaque texture for deep ocean |

**Art Style:**
- **Color:** Deep azure blue (#2b5c8a)
- **Effect:** Slight transparency (alpha 0.8) to see shore underneath
- **Detail:** Subtle white wave crests

---

## 3. 🏖️ Shoreline (The Transition)

**Requirement:** Smooth blending from Sand → Grass.

| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `shore_n.png` | 128×64 | Shore facing North (Top-Right) |
| `shore_s.png` | 128×64 | Shore facing South (Bottom-Left) |
| `shore_e.png` | 128×64 | Shore facing East (Bottom-Right) |
| `shore_w.png` | 128×64 | Shore facing West (Top-Left) |
| `shore_corner_*.png` | 128×64 | Corner pieces (NE, NW, SE, SW) |

**Art Style:**
- **Texture:** Sandy beach texture blending into grass
- **Edge:** Soft alpha gradient on the grass side

---

## 4. ⛰️ Cliffs (The Height)

**Requirement:** 3D looking vertical rock faces.

| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `cliff_face_left.png` | 64×128 | Vertical rock wall facing Left |
| `cliff_face_right.png`| 64×128 | Vertical rock wall facing Right |
| `cliff_top_edge.png`  | 64×64  | Grass-to-rock transition at top |
| `cliff_bottom.png`    | 64×64  | Rock-to-ground transition at bottom |

**Art Style:**
- **Color:** Warm browns/greys (#8b6f47)
- **Texture:** Layered sedimentary rock
- **Shadows:** Strong shadows to define depth

---

## 5. 🌳 Decorations (The Life)

**Requirement:** High-res sprites with shadows.

### Trees
| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `tree_oak_1.png` | 128×128 | Large Oak tree |
| `tree_pine_1.png` | 64×128  | Tall Pine tree |
| `tree_birch_1.png`| 64×96   | White birch tree |
| `tree_dead.png`   | 64×96   | Leafless dead tree |

### Rocks & Bushes
| File Name | Size (px) | Description |
|-----------|-----------|-------------|
| `rock_boulder.png`| 64×48   | Large gray boulder |
| `rock_cluster.png`| 64×48   | Group of small stones |
| `bush_green.png`  | 32×32   | Small green shrub |
| `bush_dry.png`    | 32×32   | Dried yellow bush |

**Art Style:**
- **Shadows:** MUST include semi-transparent shadow at base
- **Perspective:** True isometric (viewed from angle)

---

## 🎨 Technical Specifications

1. **Format:** PNG (24-bit or 32-bit)
2. **Transparency:** Alpha channel required
3. **Projection:** Isometric (2:1 ratio)
4. **Resolution:** High (retina ready preferred)

## 📦 How to Deliver

Please provide assets in the folders listed above. You can start with just:
1. One 256×128 Grass texture
2. One 128×64 Water texture
3. One Tree sprite

And we can build the HD renderer immediately!
