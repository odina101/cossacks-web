using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using Newtonsoft.Json;
using GPExtractor;
using ImageRenderer;
using Types;

namespace GPExtractorTool;

class Program
{
    static readonly string BaseDir = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", ".."));
    static readonly string OrgFilesDir = Path.Combine(BaseDir, "org-files");
    static readonly string OutputDir = Path.Combine(BaseDir, "extracted_sprites");
    static readonly string MdDir = Path.Combine(BaseDir, "MD");
    static readonly string PaletteFile = Path.Combine(OrgFilesDir, "AGEW_1.PAL");

    static void Main(string[] args)
    {
        // Check for terrain extraction mode
        if (args.Length > 0 && args[0].ToLower() == "terrain")
        {
            if (args.Length > 1)
            {
                // Extract specific map: dotnet run -- terrain MATER
                TerrainExtractor.ExtractSingleMap(args[1].ToUpper());
            }
            else
            {
                // Extract all maps: dotnet run -- terrain
                TerrainExtractor.ExtractAllTerrain();
            }
            return;
        }
        
        // Check for building extraction mode
        if (args.Length > 0 && args[0].ToLower() == "buildings")
        {
            BuildingExtractor.ExtractBuildings();
            return;
        }

        Console.WriteLine("=== Cossacks GP File Extractor with Grid Support ===");
        Console.WriteLine("Usage: dotnet run -- terrain          (to extract all terrain maps)");
        Console.WriteLine("       dotnet run -- terrain MATER    (to extract specific map)");
        Console.WriteLine("       dotnet run -- buildings        (to extract buildings)");
        Console.WriteLine("       dotnet run                     (to extract soldiers)\n");
        
        // Setup directories
        Directory.CreateDirectory(OutputDir);

        // Check palette
        if (!File.Exists(PaletteFile))
        {
            Console.WriteLine($"ERROR: Palette file not found: {PaletteFile}");
            return;
        }

        // Initialize helpers
        PrecalculatedValues.CalculateSecondPartBlockBits();
        PrecalculatedValues.CalculateSecondPartBlockLength();

        // Prepare extractor components
        var renderer = new BitmapRenderer();
        var rawParser = new RawParser();
        var extractor = new Extractor();
        var runner = new Runner();

        // Load global palette
        var paletteBytes = File.ReadAllBytes(PaletteFile);
        var colorCollection = rawParser.GetColorCollectionFromPalleteFile(paletteBytes);
        Console.WriteLine($"Loaded palette with {colorCollection.Length} colors");

        // Load MD info
        var mdInfo = LoadMdInfo(MdDir);
        Console.WriteLine($"Loaded MD info for {mdInfo.Count} units");

        // Find GP files
        var gpFiles = Directory.GetFiles(OrgFilesDir, "*.GP", SearchOption.TopDirectoryOnly);
        
        // Filter target files
        var unitGpFiles = gpFiles
            .Where(f => {
                var name = Path.GetFileNameWithoutExtension(f).ToUpperInvariant();
                return name.StartsWith("MUS") || 
                       name.StartsWith("PIK") || 
                       name.StartsWith("GRE") || 
                       name.StartsWith("OFF") || 
                       name.StartsWith("BAR");
            })
            .Take(10)
            .ToList();

        Console.WriteLine($"Processing {unitGpFiles.Count} unit GP files...\n");

        var spritesInfo = new List<SpriteGridInfo>();

        foreach (var gpFile in unitGpFiles)
        {
            try
            {
                var fileName = Path.GetFileNameWithoutExtension(gpFile).ToUpperInvariant();
                Console.WriteLine($"Processing: {fileName}");

                if (!mdInfo.TryGetValue(fileName, out var unitInfo))
                {
                    Console.WriteLine($"  Warning: No MD info found for {fileName}. Skipping grid generation.");
                    continue;
                }

                // Get Palette from GP file
                var imagePaletteBytes = extractor.GetPaletteBytes(gpFile);
                var imagePaletteColors = ImageGenerator.OffsetsToColors(imagePaletteBytes, colorCollection);

                // Extract image layouts
                var extractResult = extractor.GetImagesFromOutput(gpFile).ToList();
                
                if (extractResult.Count == 0) continue;
                if (extractResult.Count % 9 != 0)
                {
                    Console.WriteLine($"  Warning: Frame count {extractResult.Count} is not divisible by 9. Skipping grid generation.");
                    continue;
                }

                // Render all frames first
                var frames = new List<Bitmap>();
                int maxHeight = 0;

                for (int i = 0; i < extractResult.Count; i++)
                {
                    var bitmap = runner.Run(extractResult, NationColorOffset.Red, i, rawParser, renderer, imagePaletteColors, colorCollection);
                    frames.Add(bitmap);
                    if (bitmap.Height > maxHeight) maxHeight = bitmap.Height;
                }

                // Create Sprite Grid
                var numberOfFrames = frames.Count / 9;
                var maxWidth = Math.Abs(unitInfo.MirrorX) * 2;
                
                // Adjust maxHeight if needed based on ConvertAll logic (it takes max of all frames)
                // ConvertAll: var maxHeight = c.Max(it => it.Content.Height);
                // We already calculated maxHeight.

                Console.WriteLine($"  Generating grid: {numberOfFrames} frames, {maxWidth}x{maxHeight} cell size");

                using (var gridBitmap = CreateSpriteBitmap(frames, maxHeight, maxWidth, Math.Abs(unitInfo.MirrorX)))
                {
                    var outputPath = Path.Combine(OutputDir, $"{fileName}.png");
                    gridBitmap.Save(outputPath, ImageFormat.Png);
                    Console.WriteLine($"  Saved grid to {outputPath}");

                    spritesInfo.Add(new SpriteGridInfo
                    {
                        Id = unitInfo.Id,
                        UnitName = fileName,
                        SpriteWidth = maxWidth,
                        SpriteHeight = maxHeight,
                        NumberOfFrames = numberOfFrames,
                        NumberOfDirections = 16,
                        XSymmetry = Math.Abs(unitInfo.MirrorX),
                        YSymmetry = Math.Abs(unitInfo.MirrorY)
                    });
                }

                // Cleanup frames
                foreach (var frame in frames) frame.Dispose();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR processing {Path.GetFileName(gpFile)}: {ex.Message}");
            }
        }

        // Save metadata
        var metadataPath = Path.Combine(OutputDir, "sprites-info.js");
        // Format as JS variable to match request
        var json = JsonConvert.SerializeObject(spritesInfo, Formatting.None); // Compact JSON
        // Write as JS variable
        File.WriteAllText(metadataPath, "var sprites = " + json + ";");
        Console.WriteLine($"\nSaved metadata to: {metadataPath}");
    }

    static Dictionary<string, (int Id, int MirrorX, int MirrorY)> LoadMdInfo(string mdDir)
    {
        var result = new Dictionary<string, (int, int, int)>();
        if (!Directory.Exists(mdDir)) return result;

        foreach (var file in Directory.GetFiles(mdDir, "*.MD"))
        {
            var lines = File.ReadAllLines(file);
            foreach (var line in lines)
            {
                if (line.StartsWith("USERLC", StringComparison.OrdinalIgnoreCase))
                {
                    var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 6)
                    {
                        // USERLC 4 greh  shadow -62 -91
                        // 0: USERLC
                        // 1: Id
                        // 2: Name
                        // 3: Shadow?
                        // 4: X
                        // 5: Y
                        if (int.TryParse(parts[1], out int id) && 
                            int.TryParse(parts[4], out int x) && 
                            int.TryParse(parts[5], out int y))
                        {
                            var name = parts[2].ToUpperInvariant();
                            if (!result.ContainsKey(name))
                            {
                                result[name] = (id, x, y);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    static Bitmap CreateSpriteBitmap(List<Bitmap> frames, int maxHeight, int maxWidth, int xSymmetryPoint)
    {
        var gridBitmap = new Bitmap(maxWidth * 16, maxHeight * (frames.Count / 9));
        
        using (var graphics = Graphics.FromImage(gridBitmap))
        {
            for (int z = 0; z < 9; z++)
            {
                for (int i = z, j = 0; i < frames.Count; i += 9, j++)
                {
                    // Draw original
                    graphics.DrawImage(frames[i], z * maxWidth, maxHeight * j);

                    // Draw flipped (directions 9-15)
                    if (z > 0 && z < 8)
                    {
                        // z=1 -> col 15
                        // z=7 -> col 9
                        int targetCol = 16 - z;
                        
                        using (var flipped = FlipImage(frames[i], maxWidth, maxHeight, xSymmetryPoint))
                        {
                             graphics.DrawImage(flipped, targetCol * maxWidth, maxHeight * j);
                        }
                    }
                }
            }
        }
        return gridBitmap;
    }

    static Bitmap FlipImage(Bitmap original, int maxWidth, int maxHeight, int xSymmetryPoint)
    {
        var newBitmap = new Bitmap(maxWidth, maxHeight, PixelFormat.Format32bppArgb);

        var rect = new Rectangle(0, 0, original.Width, original.Height);
        var originalData = original.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        
        var newRect = new Rectangle(0, 0, newBitmap.Width, newBitmap.Height);
        var newData = newBitmap.LockBits(newRect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);

        int bytesPerPixel = 4;
        int stride = originalData.Stride;
        int height = original.Height;
        int width = original.Width;
        int newWidth = newBitmap.Width;

        byte[] buffer = new byte[stride * height];
        byte[] newBuffer = new byte[newData.Stride * height];

        Marshal.Copy(originalData.Scan0, buffer, 0, buffer.Length);

        // ConvertAll logic:
        // var c = Helper.CartesianToArrayPosition(i, j, image.Width);
        // var k = Helper.CartesianToArrayPosition(2 * jjj - 1 - i, j, newBitmap.Width);
        // jjj is xSymmetryPoint

        for (int y = 0; y < height; y++)
        {
            for (int x = 0; x < width; x++)
            {
                int oldIndex = y * stride + x * bytesPerPixel;
                
                // Calculate mirrored X
                // Formula: 2 * Center - 1 - x
                // If Center=62, x=0 -> 123. x=123 -> 0.
                int newX = 2 * xSymmetryPoint - 1 - x;

                if (newX >= 0 && newX < newWidth)
                {
                    int newIndex = y * newData.Stride + newX * bytesPerPixel;

                    // Copy pixel (ARGB)
                    newBuffer[newIndex] = buffer[oldIndex];       // B
                    newBuffer[newIndex + 1] = buffer[oldIndex + 1]; // G
                    newBuffer[newIndex + 2] = buffer[oldIndex + 2]; // R
                    newBuffer[newIndex + 3] = buffer[oldIndex + 3]; // A
                }
            }
        }

        Marshal.Copy(newBuffer, 0, newData.Scan0, newBuffer.Length);

        original.UnlockBits(originalData);
        newBitmap.UnlockBits(newData);

        return newBitmap;
    }
}

class SpriteGridInfo
{
    public int Id { get; set; }
    public int SpriteHeight { get; set; }
    public int SpriteWidth { get; set; }
    public int NumberOfFrames { get; set; }
    public int NumberOfDirections { get; set; }
    public string UnitName { get; set; } = "";
    public int XSymmetry { get; set; }
    public int YSymmetry { get; set; }
}
