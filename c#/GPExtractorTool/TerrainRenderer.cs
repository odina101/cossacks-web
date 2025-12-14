using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;

namespace GPExtractorTool;

/// <summary>
/// Renders terrain maps by assembling SMP tiles based on MSP layout.
/// </summary>
public class TerrainRenderer
{
    private readonly string _orgFilesDir;
    private readonly Dictionary<string, Bitmap> _tileCache;
    private readonly SmpRenderer _smpRenderer;
    private readonly bool _useActualTiles;
    
    public TerrainRenderer(string orgFilesDir, bool useActualTiles = true)
    {
        _orgFilesDir = orgFilesDir;
        _tileCache = new Dictionary<string, Bitmap>();
        _useActualTiles = useActualTiles;
        
        // Load palette for SMP rendering
        var palettePath = Path.Combine(orgFilesDir, "AGEW_1.PAL");
        if (File.Exists(palettePath) && useActualTiles)
        {
            var paletteData = File.ReadAllBytes(palettePath);
            _smpRenderer = new SmpRenderer(paletteData);
            Console.WriteLine("[TerrainRenderer] Loaded palette, using actual SMP tile rendering");
        }
        else
        {
            _smpRenderer = null;
            Console.WriteLine("[TerrainRenderer] Using placeholder color rendering");
        }
    }
    
    /// <summary>
    /// Render MSP map using actual SMP tiles or placeholder colors.
    /// </summary>
    public Bitmap RenderMapStructure(MspMap map, int tileSize = 32)
    {
        var (width, height, tiles) = MspParser.ExtractTileData(map);
        
        var bitmap = new Bitmap(width * tileSize, height * tileSize, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.FromArgb(120, 160, 80)); // Base terrain color
            
            // Try to render actual SMP tiles if available
            if (_useActualTiles && _smpRenderer != null)
            {
                Console.WriteLine($"[TerrainRenderer] Attempting to render {tiles.Count} tiles with actual SMP data...");
                RenderWithActualTiles(g, map, width, height, tiles, tileSize);
                return bitmap;
            }
            
            // Fallback to placeholder rendering
            Console.WriteLine("[TerrainRenderer] Using placeholder color rendering");
            
            // Draw a grid pattern to show structure
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int tileIndex = y * width + x;
                    
                    // Get tile value if available
                    int tileValue = 0;
                    if (tileIndex < tiles.Count)
                    {
                        tileValue = tiles[tileIndex];
                    }
                    
                    // Generate color based on tile value
                    Color color = GetColorForTile(tileValue);
                    
                    using (var brush = new SolidBrush(color))
                    {
                        g.FillRectangle(brush, x * tileSize, y * tileSize, tileSize, tileSize);
                    }
                    
                    // Draw grid lines
                    using (var pen = new Pen(Color.FromArgb(30, 0, 0, 0), 1))
                    {
                        g.DrawRectangle(pen, x * tileSize, y * tileSize, tileSize, tileSize);
                    }
                }
            }
            
            // Draw section boundaries
            using (var pen = new Pen(Color.Red, 2))
            {
                // Mark major sections
                for (int i = 0; i < map.SectionCount && i < 10; i++)
                {
                    int sectionX = (i % 4) * (width / 4);
                    int sectionY = (i / 4) * (height / 4);
                    g.DrawRectangle(pen, sectionX * tileSize, sectionY * tileSize, 
                                    (width / 4) * tileSize, (height / 4) * tileSize);
                }
            }
        }
        
        return bitmap;
    }
    
    private void RenderWithActualTiles(Graphics g, MspMap map, int width, int height, List<int> tiles, int tileSize)
    {
        // Get list of available SMP files
        var piecesDir = Path.Combine(_orgFilesDir, "TERRAIN", "PIECES");
        if (!Directory.Exists(piecesDir))
        {
            Console.WriteLine($"[TerrainRenderer] Pieces directory not found: {piecesDir}");
            return;
        }
        
        var smpFiles = Directory.GetFiles(piecesDir, "*.SMP")
            .OrderBy(f => f)
            .ToList();
        
        Console.WriteLine($"[TerrainRenderer] Found {smpFiles.Count} SMP tile files");
        
        int tilesRendered = 0;
        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int tileIndex = y * width + x;
                if (tileIndex >= tiles.Count) break;
                
                int tileValue = tiles[tileIndex];
                
                // Map tile value to SMP file
                int smpIndex = Math.Abs(tileValue) % smpFiles.Count;
                var smpFile = smpFiles[smpIndex];
                
                // Get or render tile
                Bitmap tileBitmap = null;
                if (_tileCache.ContainsKey(smpFile))
                {
                    tileBitmap = _tileCache[smpFile];
                }
                else if (tilesRendered < 100) // Limit initial renders
                {
                    tileBitmap = _smpRenderer.RenderSmpTile(smpFile, tileSize);
                    _tileCache[smpFile] = tileBitmap;
                    tilesRendered++;
                    
                    if (tilesRendered % 10 == 0)
                    {
                        Console.WriteLine($"[TerrainRenderer] Rendered {tilesRendered} unique tiles...");
                    }
                }
                
                // Draw tile
                if (tileBitmap != null)
                {
                    g.DrawImage(tileBitmap, x * tileSize, y * tileSize, tileSize, tileSize);
                }
            }
        }
        
        Console.WriteLine($"[TerrainRenderer] Completed - rendered {tilesRendered} unique SMP tiles");
    }
    
    private Color GetColorForTile(int tileValue)
    {
        // Map tile values to terrain colors
        // This is a placeholder - actual colors depend on terrain type
        
        if (tileValue < 0 || tileValue > 10000)
        {
            // Likely water or invalid
            return Color.DodgerBlue;
        }
        else if (tileValue < 10)
        {
            // Plain terrain
            return Color.YellowGreen;
        }
        else if (tileValue < 50)
        {
            // Forest
            return Color.ForestGreen;
        }
        else if (tileValue < 100)
        {
            // Mountains
            return Color.SaddleBrown;
        }
        else
        {
            // Other
            return Color.SandyBrown;
        }
    }
    
    /// <summary>
    /// Generate map metadata as JSON.
    /// </summary>
    public string GenerateMetadata(MspMap map)
    {
        var (width, height, tiles) = MspParser.ExtractTileData(map);
        
        // Generate walkability map (simplified - all land is walkable)
        var walkable = new List<List<int>>();
        for (int y = 0; y < height; y++)
        {
            var row = new List<int>();
            for (int x = 0; x < width; x++)
            {
                int tileIndex = y * width + x;
                int tileValue = (tileIndex < tiles.Count) ? tiles[tileIndex] : 0;
                
                // Simple heuristic: negative values or very large values are unwalkable (water)
                int walkableValue = (tileValue >= 0 && tileValue < 5000) ? 1 : 0;
                row.Add(walkableValue);
            }
            walkable.Add(row);
        }
        
        // Create JSON manually (simple format)
        var json = "{\n";
        json += $"  \"name\": \"{map.FileName}\",\n";
        json += $"  \"width\": {width},\n";
        json += $"  \"height\": {height},\n";
        json += $"  \"tileSize\": 32,\n";
        json += $"  \"sectionCount\": {map.SectionCount},\n";
        json += $"  \"tileCount\": {tiles.Count}\n";
        json += "}";
        
        return json;
    }
}
