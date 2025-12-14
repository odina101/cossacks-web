using System;
using System.Drawing;
using System.IO;

namespace GPExtractorTool;

/// <summary>
/// Parser for SMP (SAMPVERT) terrain tile files.
/// SMP format: "SAMPVERT" header + vertex/pixel data
/// </summary>
public class SmpParser
{
    public static SmpTile Parse(string filePath)
    {
        var bytes = File.ReadAllBytes(filePath);
        
        // Verify SAMPVERT header
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 8);
        if (header != "SAMPVERT")
        {
            throw new InvalidDataException($"Invalid SMP file: {filePath} - Expected SAMPVERT header");
        }
        
        // Read dimensions and data
        // Offsets based on hex analysis:
        // 8-11: size1 (int32)
        // 12-15: size2 (int32)
        int size1 = BitConverter.ToInt32(bytes, 8);
        int size2 = BitConverter.ToInt32(bytes, 12);
        
        return new SmpTile
        {
            FilePath = filePath,
            Header = header,
            DataSize1 = size1,
            DataSize2 = size2,
            RawData = bytes
        };
    }
}

public class SmpTile
{
    public string FilePath { get; set; } = "";
    public string Header { get; set; } = "";
    public int DataSize1 { get; set; }
    public int DataSize2 { get; set; }
    public byte[] RawData { get; set; } = Array.Empty<byte>();
}
