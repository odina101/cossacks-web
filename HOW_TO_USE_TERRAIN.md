# How to Use Extracted Terrain Maps

## Quick Start

The game now loads the **MATER** map by default. Just open the game and you'll see the extracted Cossacks terrain!

## Changing Maps

To use a different map, edit `js/pixi/main.js` at line ~47:

```javascript
const mapToLoad = 'MATER'; // Change this to any map name below
```

### Available Maps (21 total)

| Map Name | Sections | Description |
|----------|----------|-------------|
| MATER | 100 | Large continental map |
| KONTIN4 | 97 | Continental layout |
| MEDITER4 | 100 | Mediterranean style |
| OSTROVA2 | 100 | Islands map |
| OSTROVA3 | 100 | Islands variant |
| OSTROV4 | 100 | Islands variant 2 |
| POLUOS2 | 75 | Peninsula map |
| POLUOS3 | 99 | Peninsula variant |
| POLUOS4 | 85 | Peninsula variant 2 |
| SREDIZ4 | 101 | Mediterranean variant |
| SUHOD4 | 209 | Dry land map |
| KONTIN2 | 40 | Medium continental |
| KONTIN3 | 29 | Small continental |
| CONTIN7 | 20 | Mini continental |
| ISLANDS7 | 20 | Small islands |
| ISLANDS7_1 | 20 | Small islands variant |
| MEDITER7 | 20 | Small Mediterranean |
| POLUOS7 | 20 | Small peninsula |
| SUHOD5 | 4 | Tiny dry map |
| SUHOD6 | 4 | Tiny dry map variant |
| SUHOD7 | 4 | Tiny dry map variant 2 |

## Re-extracting Maps

If you want to re-extract maps (e.g., after modifying the renderer):

```bash
cd c#/GPExtractorTool
dotnet run -- terrain
```

This will regenerate all 21 maps in the `extracted_terrain/` folder.

## Map Format

Each extracted map folder contains:
- `{MapName}.png` - The terrain image (2048×2048px)
- `{MapName}.json` - Map metadata with dimensions and section count

Example JSON:
```json
{
  "name": "MATER",
  "width": 64,
  "height": 64,
  "tileSize": 32,
  "sectionCount": 100,
  "tileCount": 459
}
```

## Color Legend (Current Placeholder Rendering)

- **Blue** - Water / unwalkable
- **Green** - Land / walkable
- **Orange/Brown** - Varied terrain (mountains, forests)
- **Red lines** - Section boundaries

## Development

### Adding Better Tile Rendering

The current implementation uses placeholder colors. To render actual terrain tiles:

1. Parse SMP files fully in `SmpParser.cs`
2. Extract tile graphics using palette (`AGEW_1.PAL`)
3. Render tiles in `TerrainRenderer.cs` based on tile indices from MSP
4. Assemble into final composite image

### Adding Walkability

To add proper walkability detection:

1. Analyze tile types from MSP tile indices
2. Map tile types to walkable/unwalkable in `TerrainRenderer.cs`
3. Export walkability grid in JSON metadata
4. Use in `Pathfinding.js` for unit movement

### Adding Resources

To show resource locations (gold, stone, etc.):

1. Parse `RES.DAT` in `DatParser.cs`
2. Extract resource positions
3. Include in JSON metadata
4. Render resource icons in game

## Troubleshooting

### Map doesn't load
- Check browser console for errors
- Verify `extracted_terrain/{MapName}/` folder exists
- Ensure PNG and JSON files are present

### Wrong map appears
- Check the `mapToLoad` variable in `js/pixi/main.js`
- Clear browser cache (Ctrl+Shift+R)

### Want to see all maps
Open `extracted_terrain/` folder and view PNG files directly to preview all maps before choosing one for the game.
