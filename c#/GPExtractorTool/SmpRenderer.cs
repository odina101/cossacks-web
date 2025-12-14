using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;

namespace GPExtractorTool;

/// <summary>
/// Renders SMP (SAMPVERT) 3D mesh terrain tiles.
/// Parses vertex data and renders as isometric 2D tiles.
/// </summary>
public class SmpRenderer
{
    private readonly Color[] _palette;
    
    public SmpRenderer(byte[] paletteData)
    {
        _palette = ParsePalette(paletteData);
    }
    
    private Color[] ParsePalette(byte[] data)
    {
        var colors = new Color[256];
        for (int i = 0; i < 256; i++)
        {
            int offset = i * 3;
            colors[i] = Color.FromArgb(
                Math.Min(255, data[offset] * 4),     // R
                Math.Min(255, data[offset + 1] * 4), // G
                Math.Min(255, data[offset + 2] * 4)  // B
            );
        }
        return colors;
    }
    
    public Bitmap RenderSmpTile(string smpPath, int tileSize = 64)
    {
        try
        {
            var bytes = File.ReadAllBytes(smpPath);
            
            // Verify header
            var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 8);
            if (header != "SAMPVERT")
            {
                throw new InvalidDataException($"Invalid SMP file: {smpPath}");
            }
            
            // Parse header data
            int dataSize1 = BitConverter.ToInt32(bytes, 8);
            int dataSize2 = BitConverter.ToInt32(bytes, 12);
            
            // Parse vertex data (starts at offset 16)
            var vertices = ParseVertices(bytes, 16, dataSize2);
            
            // Render as isometric tile
            return RenderIsometric(vertices, tileSize);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error rendering {Path.GetFileName(smpPath)}: {ex.Message}");
            // Return blank tile
            return new Bitmap(tileSize, tileSize);
        }
    }
    
    private List<Vertex> ParseVertices(byte[] data, int offset, int count)
    {
        var vertices = new List<Vertex>();
        
        // SMP format: each vertex is likely 2-3 int16 values (x, y, z or x, y, color)
        int stride = 8; // Estimate: 4 int16 values per vertex
        
        for (int i = 0; i < Math.Min(count, 1000); i++)
        {
            int pos = offset + (i * stride);
            if (pos + stride >= data.Length) break;
            
            short x = BitConverter.ToInt16(data, pos);
            short y = BitConverter.ToInt16(data, pos + 2);
            short z = BitConverter.ToInt16(data, pos + 4);
            short colorIndex = BitConverter.ToInt16(data, pos + 6);
            
            vertices.Add(new Vertex
            {
                X = x,
                Y = y,
                Z = z,
                ColorIndex = Math.Abs(colorIndex % 256)
            });
        }
        
        return vertices;
    }
    
    private Bitmap RenderIsometric(List<Vertex> vertices, int size)
    {
        var bitmap = new Bitmap(size, size);
        
        if (vertices.Count == 0)
        {
            return bitmap;
        }
        
        using (var g = Graphics.FromImage(bitmap))
        {
            g.Clear(Color.Transparent);
            
            // Calculate bounds
            var minX = vertices.Min(v => v.X);
            var maxX = vertices.Max(v => v.X);
            var minY = vertices.Min(v => v.Y);
            var maxY = vertices.Max(v => v.Y);
            var minZ = vertices.Min(v => v.Z);
            var maxZ = vertices.Max(v => v.Z);
            
            float rangeX = maxX - minX;
            float rangeY = maxY - minY;
            float rangeZ = maxZ - minZ;
            
            if (rangeX == 0) rangeX = 1;
            if (rangeY == 0) rangeY = 1;
            if (rangeZ == 0) rangeZ = 1;
            
            // Sort vertices by depth (back to front)
            vertices = vertices.OrderBy(v => v.Y + v.Z).ToList();
            
            // Render each vertex as a small point/quad
            foreach (var v in vertices)
            {
                // Isometric projection
                float screenX = ((v.X - minX) / rangeX) * (size * 0.8f) + (size * 0.1f);
                float screenY = ((v.Y - minY) / rangeY) * (size * 0.6f) + (size * 0.2f);
                
                // Apply height (Z) offset
                float heightOffset = ((v.Z - minZ) / rangeZ) * (size * 0.3f);
                screenY -= heightOffset;
                
                // Get color
                Color color = _palette[v.ColorIndex];
                
                // Apply shading based on height
                float shade = 0.5f + ((v.Z - minZ) / rangeZ) * 0.5f;
                color = Color.FromArgb(
                    (int)(color.R * shade),
                    (int)(color.G * shade),
                    (int)(color.B * shade)
                );
                
                // Draw point (2x2 pixel for visibility)
                using (var brush = new SolidBrush(color))
                {
                    g.FillRectangle(brush, screenX, screenY, 2, 2);
                }
            }
        }
        
        return bitmap;
    }
}

public class Vertex
{
    public short X { get; set; }
    public short Y { get; set; }
    public short Z { get; set; }
    public int ColorIndex { get; set; }
}
