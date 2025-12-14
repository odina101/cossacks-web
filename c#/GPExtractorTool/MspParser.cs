using System;
using System.Collections.Generic;
using System.IO;

namespace GPExtractorTool;

/// <summary>
/// Parser for MSP (map) files.
/// MSP format: "COST" header + section count + offset table + tile placement data
/// </summary>
public class MspParser
{
    public static MspMap Parse(string filePath)
    {
        var bytes = File.ReadAllBytes(filePath);
        
        // Verify COST header
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 4);
        if (header != "COST")
        {
            throw new InvalidDataException($"Invalid MSP file: {filePath} - Expected COST header");
        }
        
        // Read section count
        int sectionCount = BitConverter.ToInt32(bytes, 4);
        
        // Read offset table
        var offsets = new List<int>();
        int offsetTableStart = 8;
        
        for (int i = 0; i < sectionCount; i++)
        {
            int offset = BitConverter.ToInt32(bytes, offsetTableStart + (i * 4));
            offsets.Add(offset);
        }
        
        // Parse sections
        var sections = new List<MspSection>();
        
        for (int i = 0; i < sectionCount; i++)
        {
            int startOffset = offsets[i];
            int endOffset = (i < sectionCount - 1) ? offsets[i + 1] : bytes.Length;
            int sectionSize = endOffset - startOffset;
            
            var sectionData = new byte[sectionSize];
            Array.Copy(bytes, startOffset, sectionData, 0, sectionSize);
            
            sections.Add(new MspSection
            {
                Index = i,
                Offset = startOffset,
                Size = sectionSize,
                Data = sectionData
            });
        }
        
        return new MspMap
        {
            FilePath = filePath,
            FileName = Path.GetFileNameWithoutExtension(filePath),
            Header = header,
            SectionCount = sectionCount,
            Offsets = offsets,
            Sections = sections,
            RawData = bytes
        };
    }
    
    /// <summary>
    /// Try to extract map dimensions and tile data from parsed MSP.
    /// This is experimental and may need adjustment based on actual format.
    /// </summary>
    public static (int width, int height, List<int> tiles) ExtractTileData(MspMap map)
    {
        // The actual tile data structure needs to be reverse-engineered
        // For now, return placeholder data
        // TODO: Analyze the section data to extract actual tile indices
        
        // Common Cossacks map sizes: 64x64, 128x128, 256x256, etc.
        // Try to guess from section sizes
        int estimatedTileCount = map.Sections.Count > 0 ? map.Sections[0].Size / 4 : 0;
        int estimatedSize = (int)Math.Sqrt(estimatedTileCount);
        
        // Round to common power of 2
        int size = 64;
        while (size < estimatedSize && size < 512)
        {
            size *= 2;
        }
        
        var tiles = new List<int>();
        
        // Extract tile indices from first section
        if (map.Sections.Count > 0)
        {
            var data = map.Sections[0].Data;
            
            // Skip any header data and read tile indices
            // Tiles are likely stored as int16 or int32 values
            for (int i = 0; i < data.Length - 1; i += 2)
            {
                // Read as int16 (2 bytes per tile index)
                short tileIndex = BitConverter.ToInt16(data, i);
                tiles.Add(tileIndex);
                
                if (tiles.Count >= size * size)
                {
                    break;
                }
            }
        }
        
        return (size, size, tiles);
    }
}

public class MspMap
{
    public string FilePath { get; set; } = "";
    public string FileName { get; set; } = "";
    public string Header { get; set; } = "";
    public int SectionCount { get; set; }
    public List<int> Offsets { get; set; } = new();
    public List<MspSection> Sections { get; set; } = new();
    public byte[] RawData { get; set; } = Array.Empty<byte>();
}

public class MspSection
{
    public int Index { get; set; }
    public int Offset { get; set; }
    public int Size { get; set; }
    public byte[] Data { get; set; } = Array.Empty<byte>();
}
