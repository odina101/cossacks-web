# Character Direction Fix - Summary

## Problem
Character had invalid direction when moving along a path.

## Root Causes Identified

1. **Direction not set at movement start**: When `moveTo()` was called, the direction wasn't immediately updated
2. **Unstable direction calculation**: Direction was calculated even with very small movement vectors near the target
3. **No direction update at waypoints**: When reaching a waypoint and moving to the next one, direction wasn't updated
4. **Inconsistent direction formulas**: Different methods used different direction calculation formulas
5. **No validation**: Invalid direction values (< 0 or > 15) could propagate to rendering

## Fixes Applied

### 1. Unit.js - Initial Direction Setting (`moveTo` method)
**File**: `js/pixi/Unit.js` (lines ~145-163)

- Added immediate direction calculation when movement starts
- Direction is now set BEFORE movement begins, not during first frame

```javascript
// Calculate initial direction immediately
const dx = targetX - this.x;
const dy = targetY - this.y;
if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    const initialDirection = this.getDirectionFromVector(dx, dy);
    this.n = initialDirection;
}
```

### 2. Unit.js - Direction Stability (`updateMovement` method)
**File**: `js/pixi/Unit.js` (lines ~208-212)

- Only update direction when distance > 0.1 pixels (prevents unstable calculations)
- Direction update happens BEFORE position update (uses full vector, not remainder)

```javascript
if (distance > 0.1) { // Only update direction if we have a meaningful vector
    this.n = this.getDirectionFromVector(dx, dy);
}
```

### 3. Unit.js - Waypoint Transitions
**File**: `js/pixi/Unit.js` (lines ~188-200)

- When reaching a waypoint, immediately calculate direction to next waypoint
- Prevents direction from being "stale" between path segments

```javascript
// Update direction for next segment if there is one
if (this.pathIndex < this.path.length) {
    const nextTarget = this.path[this.pathIndex];
    const nextDx = nextTarget.x - this.x;
    const nextDy = nextTarget.y - this.y;
    const nextDistance = Math.sqrt(nextDx * nextDx + nextDy * nextDy);
    
    if (nextDistance > 0.1) {
        this.n = this.getDirectionFromVector(nextDx, nextDy);
    }
}
```

### 4. Unit.js - Enhanced Direction Calculation
**File**: `js/pixi/Unit.js` (`getDirectionFromVector` method)

- Added validation for near-zero vectors
- Added validation for output (isNaN, out of range)
- Returns current direction if calculation fails

```javascript
// Validate inputs
if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return this.n; // Keep current direction if vector is too small
}

// Validate output
if (isNaN(direction) || direction < 0 || direction > 15) {
    console.error('[Unit] Invalid direction calculated:', direction);
    return this.n; // Keep current direction if calculation fails
}
```

### 5. Pathfinding.js - Consistent Formula
**File**: `js/pixi/Pathfinding.js` (`getDirection` static method)

- Updated to use same formula as Unit class
- Ensures consistency across codebase

### 6. ThreeRender.js - Direction Validation
**File**: `js/three/ThreeRender.js` (lines ~286-290)

- Added validation before using direction in rendering
- Clamps invalid values to 0 to prevent rendering errors

```javascript
// Validate and clamp direction to valid range (0-15)
let direction = unit.n;
if (isNaN(direction) || direction < 0 || direction > 15) {
    console.error(`[ThreeRender] Invalid unit direction: ${direction}, clamping to 0`);
    direction = 0;
    unit.n = 0;
}
```

### 7. Debug Tools Added

**Test Function** (`js/pixi/Unit.js`):
```javascript
Unit.testDirectionCalculation()  // Verifies direction formula for all 16 directions
```

**Enhanced Debug Display** (`index.html`, `main.js`):
- Shows current direction (0-15)
- Shows if unit is moving
- Shows current animation
- Shows movement vector (dx, dy)
- Shows target position

## Direction System Explained

The original Cossacks direction system uses 16 directions (0-15):

### Formula
- **Original**: `dx = cos((N+4)*PI/8)`, `dy = sin((N+4)*PI/8)`
- **Reverse**: `N = (angle / (PI/8)) - 4` where `angle = atan2(dy, dx)`

### Direction Mapping
- **N=0**: South (dy > 0, dx ≈ 0)
- **N=4**: West (dx < 0, dy ≈ 0)
- **N=8**: North (dy < 0, dx ≈ 0)
- **N=12**: East (dx > 0, dy ≈ 0)

The sprite sheet is organized with:
- X-axis: 16 columns for each direction (0-15)
- Y-axis: Rows for each animation frame

## How to Test

1. **Open browser console** (F12)
2. **Look for test output** at startup:
   ```
   === Testing Direction Calculation ===
   N= 0: dx=... dy=... -> dir= 0 ✓
   N= 1: dx=... dy=... -> dir= 1 ✓
   ...
   ```

3. **Check debug display** (top-right corner):
   - Direction should be 0-15
   - Direction should match movement direction
   - When moving right: direction should be ~12
   - When moving down: direction should be ~0
   - When moving left: direction should be ~4
   - When moving up: direction should be ~8

4. **Test movement**:
   - Right-click to move character
   - Watch console logs for direction changes
   - Check that sprite faces the direction of movement

## Console Logs to Watch For

### Good Signs:
```
[Unit] MOVE ORDER: (1024, 1024) -> (1200, 1024) distance: 176
[Unit] Initial direction set to 12 (was 0)
[Unit] Movement started, isMoving=true, path length=2, direction=12
[Unit] Moving... pos=(1100, 1024) remaining=100 dir=12
[Unit] Reached destination! Final position: 1200 1024 Final direction: 12
```

### Bad Signs (these should NOT appear):
```
[Unit] Invalid direction calculated: NaN from dx= ... dy= ...
[ThreeRender] Invalid unit direction: -5, clamping to 0
[Unit] getDirectionFromVector called with near-zero vector
```

## Coordinate System Notes

The game uses a **2D coordinate system** for logic:
- X: horizontal (right is positive)
- Y: vertical (down is positive)

The **Three.js renderer** uses a transformed 3D coordinate system:
- 3D X = Game X
- 3D Z = -Game Y (Z points "forward" which is -Y in game)
- 3D Y = terrain height

This transformation is handled correctly in both rendering and input handling.

## Still Having Issues?

If the character still has wrong direction:

1. **Check console for errors** - Look for direction-related warnings/errors
2. **Verify sprite sheet** - Ensure sprite sheet has 16 directions horizontally
3. **Check animation type** - Walk animation should be 'G' (not 'S' for standing)
4. **Test with keyboard** - Use arrow keys to manually rotate character and verify each direction renders correctly
5. **Check coordinate system** - Verify clicks are being translated correctly from 3D to game coordinates

## Files Modified

1. `js/pixi/Unit.js` - Main movement and direction calculation
2. `js/pixi/Pathfinding.js` - Direction calculation helper
3. `js/three/ThreeRender.js` - Direction validation in renderer
4. `js/pixi/main.js` - Enhanced debug display, test function call
5. `index.html` - Added debug info display fields

## Verification Checklist

- [ ] Direction test passes for all 16 directions
- [ ] Character faces correct direction when movement starts
- [ ] Direction updates smoothly during movement
- [ ] Direction correct at waypoint transitions
- [ ] No invalid direction errors in console
- [ ] Debug display shows direction 0-15
- [ ] Character sprite matches movement direction visually
