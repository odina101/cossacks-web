using System;
using System.Drawing.Imaging;
using System.IO;

namespace GPExtractorTool;

/// <summary>
/// Main terrain extraction orchestrator.
/// Extracts all MSP maps to PNG images with metadata.
/// </summary>
public class TerrainExtractor
{
    private readonly string _orgFilesDir;
    private readonly string _outputDir;
    private readonly TerrainRenderer _renderer;
    
    public TerrainExtractor(string orgFilesDir, string outputDir, bool useActualTiles = true)
    {
        _orgFilesDir = orgFilesDir;
        _outputDir = outputDir;
        _renderer = new TerrainRenderer(orgFilesDir, useActualTiles);
    }
    
    public static void ExtractAllTerrain()
    {
        Console.WriteLine("=== Cossacks Terrain Extractor ===\n");
        
        var baseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", ".."));
        var orgFilesDir = Path.Combine(baseDir, "org-files");
        var terrainDir = Path.Combine(orgFilesDir, "TERRAIN");
        var outputDir = Path.Combine(baseDir, "extracted_terrain");
        
        // Create output directory
        Directory.CreateDirectory(outputDir);
        
        // Find all MSP files
        var mspFiles = Directory.GetFiles(terrainDir, "*.MSP");
        Console.WriteLine($"Found {mspFiles.Length} MSP map files\n");
        
        var extractor = new TerrainExtractor(orgFilesDir, outputDir, useActualTiles: true);
        
        int successCount = 0;
        int failCount = 0;
        
        foreach (var mspFile in mspFiles)
        {
            try
            {
                var mapName = Path.GetFileNameWithoutExtension(mspFile);
                Console.WriteLine($"Processing: {mapName}");
                
                // Parse MSP
                var map = MspParser.Parse(mspFile);
                Console.WriteLine($"  Sections: {map.SectionCount}");
                
                // Create output directory for this map
                var mapOutputDir = Path.Combine(outputDir, mapName);
                Directory.CreateDirectory(mapOutputDir);
                
                // Render map visualization
                using (var bitmap = extractor._renderer.RenderMapStructure(map))
                {
                    var pngPath = Path.Combine(mapOutputDir, $"{mapName}.png");
                    bitmap.Save(pngPath, ImageFormat.Png);
                    Console.WriteLine($"  Saved: {pngPath} ({bitmap.Width}x{bitmap.Height})");
                }
                
                // Generate metadata
                var metadata = extractor._renderer.GenerateMetadata(map);
                var metadataPath = Path.Combine(mapOutputDir, $"{mapName}.json");
                File.WriteAllText(metadataPath, metadata);
                Console.WriteLine($"  Metadata: {metadataPath}");
                
                successCount++;
                Console.WriteLine($"  ✓ Success\n");
            }
            catch (Exception ex)
            {
                failCount++;
                Console.WriteLine($"  ✗ Error: {ex.Message}\n");
            }
        }
        
        Console.WriteLine($"\n=== Extraction Complete ===");
        Console.WriteLine($"Success: {successCount}");
        Console.WriteLine($"Failed: {failCount}");
        Console.WriteLine($"Output directory: {outputDir}");
    }
    
    public static void ExtractSingleMap(string mapName)
    {
        Console.WriteLine($"=== Extracting Map: {mapName} ===\n");
        
        var baseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", ".."));
        var orgFilesDir = Path.Combine(baseDir, "org-files");
        var terrainDir = Path.Combine(orgFilesDir, "TERRAIN");
        var outputDir = Path.Combine(baseDir, "extracted_terrain");
        
        var mspFile = Path.Combine(terrainDir, $"{mapName}.MSP");
        
        if (!File.Exists(mspFile))
        {
            Console.WriteLine($"ERROR: Map file not found: {mspFile}");
            return;
        }
        
        Directory.CreateDirectory(outputDir);
        
        var extractor = new TerrainExtractor(orgFilesDir, outputDir, useActualTiles: true);
        
        try
        {
            // Parse MSP
            var map = MspParser.Parse(mspFile);
            Console.WriteLine($"Sections: {map.SectionCount}");
            
            // Create output directory
            var mapOutputDir = Path.Combine(outputDir, mapName);
            Directory.CreateDirectory(mapOutputDir);
            
            // Render
            using (var bitmap = extractor._renderer.RenderMapStructure(map))
            {
                var pngPath = Path.Combine(mapOutputDir, $"{mapName}.png");
                bitmap.Save(pngPath, ImageFormat.Png);
                Console.WriteLine($"Saved: {pngPath} ({bitmap.Width}x{bitmap.Height})");
            }
            
            // Metadata
            var metadata = extractor._renderer.GenerateMetadata(map);
            var metadataPath = Path.Combine(mapOutputDir, $"{mapName}.json");
            File.WriteAllText(metadataPath, metadata);
            Console.WriteLine($"Metadata: {metadataPath}");
            
            Console.WriteLine("\n✓ Extraction complete!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n✗ Error: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }
}
