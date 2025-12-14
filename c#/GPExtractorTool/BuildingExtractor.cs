using System.Drawing;
using System.Drawing.Imaging;
using Newtonsoft.Json;
using GPExtractor;
using ImageRenderer;
using Types;

namespace GPExtractorTool;

/// <summary>
/// Extracts building sprites from GP files.
/// Buildings are simpler than soldiers - usually static, 1 direction, no mirroring.
/// </summary>
class BuildingExtractor
{
    static readonly string BaseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", ".."));
    static readonly string OrgFilesDir = Path.Combine(BaseDir, "org-files");
    static readonly string OutputDir = Path.Combine(BaseDir, "sprites_png");
    static readonly string PaletteFile = Path.Combine(OrgFilesDir, "AGEW_1.PAL");

    public static void ExtractBuildings()
    {
        Console.WriteLine("=== Building Extractor ===\n");
        
        // Setup
        Directory.CreateDirectory(OutputDir);
        
        if (!File.Exists(PaletteFile))
        {
            Console.WriteLine($"ERROR: Palette not found: {PaletteFile}");
            return;
        }

        // Init
        PrecalculatedValues.CalculateSecondPartBlockBits();
        PrecalculatedValues.CalculateSecondPartBlockLength();

        var renderer = new BitmapRenderer();
        var rawParser = new RawParser();
        var extractor = new Extractor();
        var runner = new Runner();

        // Load palette
        var paletteBytes = File.ReadAllBytes(PaletteFile);
        var colorCollection = rawParser.GetColorCollectionFromPalleteFile(paletteBytes);

        // Building GP files to extract
        // CEH = Center Holland, CEI = Center Spain, CEP = Center Poland
        // BUI = generic building
        var buildingFiles = new[] { "CEH", "CEI", "CEP", "CES", "BUI" };
        
        var buildingsInfo = new List<BuildingInfo>();

        foreach (var buildingName in buildingFiles)
        {
            var gpFile = Path.Combine(OrgFilesDir, $"{buildingName}.GP");
            if (!File.Exists(gpFile))
            {
                Console.WriteLine($"Skipping {buildingName} - file not found");
                continue;
            }

            try
            {
                Console.WriteLine($"Processing: {buildingName}");

                // Get palette from GP file
                var imagePaletteBytes = extractor.GetPaletteBytes(gpFile);
                var imagePaletteColors = ImageGenerator.OffsetsToColors(imagePaletteBytes, colorCollection);

                // Extract frames
                var extractResult = extractor.GetImagesFromOutput(gpFile).ToList();
                
                if (extractResult.Count == 0)
                {
                    Console.WriteLine($"  No frames found");
                    continue;
                }

                Console.WriteLine($"  Found {extractResult.Count} frames");

                // Save ALL frames so we can see which one is correct
                var buildingDir = Path.Combine(OutputDir, buildingName);
                Directory.CreateDirectory(buildingDir);

                // Try to find the best frame - typically the last "complete" building frame
                // Frame layout varies: build stages, complete, destruction
                // Let's save a few frames and pick the best one
                
                Bitmap? bestBitmap = null;
                int bestFrameIndex = 0;
                int maxPixels = 0;

                for (int frameIdx = 0; frameIdx < extractResult.Count; frameIdx++)
                {
                    // Use Gray for neutral colors (buildings shouldn't have strong nation colors)
                    var frameBitmap = runner.Run(extractResult, NationColorOffset.Gray, frameIdx, rawParser, renderer, imagePaletteColors, colorCollection);
                    
                    // Save each frame for inspection
                    var framePath = Path.Combine(buildingDir, $"{buildingName}_frame{frameIdx:D2}.png");
                    frameBitmap.Save(framePath, ImageFormat.Png);
                    
                    // Track largest frame (likely the complete building)
                    int pixels = frameBitmap.Width * frameBitmap.Height;
                    if (pixels > maxPixels)
                    {
                        maxPixels = pixels;
                        bestFrameIndex = frameIdx;
                        bestBitmap?.Dispose();
                        bestBitmap = frameBitmap;
                    }
                    else
                    {
                        frameBitmap.Dispose();
                    }
                }

                // Use the largest frame as the main building image
                var bitmap = bestBitmap!;
                Console.WriteLine($"  Selected frame {bestFrameIndex} as main (largest)");
                
                // Save main building image
                var outputPath = Path.Combine(buildingDir, $"{buildingName}.png");
                bitmap.Save(outputPath, ImageFormat.Png);
                Console.WriteLine($"  Saved to {outputPath} ({bitmap.Width}x{bitmap.Height})");

                buildingsInfo.Add(new BuildingInfo
                {
                    Name = buildingName,
                    Width = bitmap.Width,
                    Height = bitmap.Height,
                    Type = "building",
                    FrameCount = extractResult.Count
                });

                bitmap.Dispose();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
            }
        }

        // Save building metadata
        var metadataPath = Path.Combine(OutputDir, "buildings-info.js");
        var json = JsonConvert.SerializeObject(buildingsInfo, Formatting.Indented);
        File.WriteAllText(metadataPath, "var buildings = " + json + ";");
        Console.WriteLine($"\nSaved building metadata to: {metadataPath}");
    }
}

class BuildingInfo
{
    public string Name { get; set; } = "";
    public int Width { get; set; }
    public int Height { get; set; }
    public string Type { get; set; } = "";
    public int FrameCount { get; set; }
}
