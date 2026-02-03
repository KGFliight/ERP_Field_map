# Imagery Pipeline

This document describes how to obtain, process, and distribute satellite imagery for the ERP Field Map application.

## ⚠️ IMPORTANT: Imagery Rights

**DO NOT** scrape, cache, or redistribute tiles from consumer satellite providers such as:
- Google Maps/Earth
- Apple Maps
- Bing Maps
- Mapbox (unless properly licensed)

These services explicitly prohibit offline caching and redistribution in their terms of service.

## Legal Imagery Sources

### 1. Client-Provided Imagery

The recommended approach for ERP operations:

- **Aerial Survey**: Commission drone or aircraft imagery of the operations area
- **Licensed Satellite**: Purchase satellite imagery from providers like:
  - Maxar (WorldView, GeoEye)
  - Planet Labs
  - Airbus (Pléiades, SPOT)
  - Nearmap (Australia focus)

### 2. Open Data Sources

For areas where high-resolution commercial imagery is not required:

- **Landsat** (30m resolution) - Free, US Government
- **Sentinel-2** (10m resolution) - Free, European Space Agency
- **NAIP** (1m resolution, US only) - Free, USDA

### 3. Licensed Tile Providers

If online fallback tiles are acceptable:

- **MapTiler** - Satellite tiles with offline caching license available
- **Esri World Imagery** - Commercial license for offline use
- **HERE Maps** - Enterprise licensing for offline

## Processing Workflow

### Step 1: Obtain Source Imagery

Ensure you have proper rights to use and distribute the imagery offline.

Supported input formats:
- GeoTIFF
- COG (Cloud-Optimized GeoTIFF)
- JPEG2000
- MrSID

### Step 2: Define Area of Interest (AOI)

Create a GeoJSON polygon defining the operations area:

```json
{
  "type": "Polygon",
  "coordinates": [[
    [138.5, -34.8],
    [138.8, -34.8],
    [138.8, -35.0],
    [138.5, -35.0],
    [138.5, -34.8]
  ]]
}
```

Save as `aoi.geojson`.

### Step 3: Create Tile Pyramid

Use GDAL to create a tile pyramid:

```bash
# Install GDAL
brew install gdal  # macOS
apt install gdal-bin  # Ubuntu

# Create MBTiles from GeoTIFF
gdal_translate -of MBTiles \
  -co TILE_FORMAT=JPEG \
  -co QUALITY=85 \
  -co ZOOM_LEVEL_STRATEGY=LOWER \
  input.tif \
  output.mbtiles

# Generate overview tiles
gdaladdo output.mbtiles 2 4 8 16 32
```

### Step 4: Convert to PMTiles

Install PMTiles CLI:

```bash
# Using Go
go install github.com/protomaps/go-pmtiles/cmd/pmtiles@latest

# Or download binary from
# https://github.com/protomaps/go-pmtiles/releases
```

Convert MBTiles to PMTiles:

```bash
pmtiles convert output.mbtiles erp_sat_v1.pmtiles
```

Verify the output:

```bash
pmtiles show erp_sat_v1.pmtiles
```

### Step 5: Optimize for Size

PMTiles typically produces smaller files than MBTiles, but you can further optimize:

```bash
# Compress at higher level (slower but smaller)
pmtiles convert output.mbtiles erp_sat_v1.pmtiles --tmpdir=/tmp

# For very large areas, consider reducing max zoom
# Edit the gdal_translate command to limit zoom levels
```

## Recommended Tile Specifications

| Parameter | Recommended Value |
|-----------|-------------------|
| Tile Format | JPEG (satellite) or PNG (with transparency) |
| Tile Size | 256x256 or 512x512 |
| JPEG Quality | 80-90 |
| Max Zoom Level | 16-18 (depending on source resolution) |
| Min Zoom Level | 8-10 |
| Projection | Web Mercator (EPSG:3857) |

## Hosting the Basemap

### File Size Considerations

- 50 km² at zoom 18: ~100-500 MB
- 500 km² at zoom 16: ~200 MB - 1 GB
- Full state/region at zoom 14: ~1-5 GB

### Hosting Options

1. **CDN (Recommended)**: CloudFront, Cloudflare, Fastly
   - Best for large files
   - Edge caching for fast downloads
   - Pay-per-transfer pricing

2. **Object Storage**: S3, Google Cloud Storage, Azure Blob
   - Direct links work for smaller files
   - Consider CDN in front for large files

3. **Static Host**: Netlify LFS, Vercel
   - May have size limits (check provider)
   - Good for smaller basemaps

### Download Performance

Large PMTiles files (>100MB) may take time to download. Consider:

- Show download progress to user
- Allow background download
- Chunk large files if needed

## Updating Basemaps

When new imagery is available:

1. Process new imagery with same workflow
2. Generate new PMTiles file with new version ID:
   ```
   erp_sat_v2.pmtiles
   ```
3. Update manifest.json with new basemap entry
4. Users will be prompted to download the update

## Example: Processing Drone Imagery

```bash
# 1. Stitch orthomosaic from drone imagery (use Pix4D, ODM, etc.)
# Output: orthomosaic.tif

# 2. Clip to AOI
gdalwarp -cutline aoi.geojson -crop_to_cutline \
  orthomosaic.tif clipped.tif

# 3. Reproject to Web Mercator
gdalwarp -t_srs EPSG:3857 clipped.tif reprojected.tif

# 4. Create MBTiles with tiles
gdal_translate -of MBTiles \
  -co TILE_FORMAT=JPEG \
  -co QUALITY=85 \
  reprojected.tif output.mbtiles

# 5. Add overviews
gdaladdo -r average output.mbtiles 2 4 8 16

# 6. Convert to PMTiles
pmtiles convert output.mbtiles erp_sat_v1.pmtiles
```

## Troubleshooting

### Tiles Not Loading

1. Verify PMTiles file is not corrupted:
   ```bash
   pmtiles show erp_sat_v1.pmtiles
   ```
2. Check file is accessible via URL
3. Ensure CORS headers are set correctly

### Blank Areas

- Check if source imagery covers the area
- Verify AOI polygon is correct
- Check zoom levels in tile pyramid

### Poor Performance

- Reduce max zoom level
- Increase JPEG compression
- Use 256x256 tiles instead of 512x512

### File Too Large

- Reduce coverage area
- Lower max zoom level
- Increase JPEG compression
- Consider splitting into regional tiles
