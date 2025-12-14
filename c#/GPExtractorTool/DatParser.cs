using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace GPExtractorTool;

/// <summary>
/// Parser for DAT and LST configuration files.
/// These are mostly text files with terrain type definitions.
/// </summary>
public class DatParser
{
    public static List<TerrainType> ParseTerrList(string filePath)
    {
        var terrainTypes = new List<TerrainType>();
        
        if (!File.Exists(filePath))
        {
            return terrainTypes;
        }
        
        var lines = File.ReadAllLines(filePath);
        
        foreach (var line in lines)
        {
            // Format: "1 0 Pieces\PlainTerrain.terr"
            var parts = line.Split(new[] { ' ' }, 3, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 3)
            {
                if (int.TryParse(parts[0], out int style) && 
                    int.TryParse(parts[1], out int type))
                {
                    terrainTypes.Add(new TerrainType
                    {
                        Style = style,
                        Type = type,
                        Path = parts[2]
                    });
                }
            }
        }
        
        return terrainTypes;
    }
    
    public static List<string> ParseLstFile(string filePath)
    {
        var files = new List<string>();
        
        if (!File.Exists(filePath))
        {
            return files;
        }
        
        var lines = File.ReadAllLines(filePath);
        
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (!string.IsNullOrEmpty(trimmed))
            {
                files.Add(trimmed);
            }
        }
        
        return files;
    }
}

public class TerrainType
{
    public int Style { get; set; }
    public int Type { get; set; }
    public string Path { get; set; } = "";
}
