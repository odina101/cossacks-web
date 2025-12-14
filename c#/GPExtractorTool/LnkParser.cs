using System;
using System.IO;

namespace GPExtractorTool;

/// <summary>
/// Parser for LNK files (tile link/connection data).
/// LNK format: "PSMS" header + connection data
/// </summary>
public class LnkParser
{
    public static LnkFile Parse(string filePath)
    {
        var bytes = File.ReadAllBytes(filePath);
        
        // Verify PSMS header
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 4);
        if (header != "PSMS")
        {
            throw new InvalidDataException($"Invalid LNK file: {filePath} - Expected PSMS header");
        }
        
        // Read connection data
        // Offset 4-7: size (int32)
        // Offset 8-11: count (int32)
        int size = BitConverter.ToInt32(bytes, 4);
        int count = BitConverter.ToInt32(bytes, 8);
        
        return new LnkFile
        {
            FilePath = filePath,
            Header = header,
            Size = size,
            Count = count,
            RawData = bytes
        };
    }
}

public class LnkFile
{
    public string FilePath { get; set; } = "";
    public string Header { get; set; } = "";
    public int Size { get; set; }
    public int Count { get; set; }
    public byte[] RawData { get; set; } = Array.Empty<byte>();
}
