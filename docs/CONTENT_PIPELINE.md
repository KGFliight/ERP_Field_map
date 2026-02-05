# Content Pipeline

This document describes how to publish and update content for the ERP Field Map application.

## Overview

The app fetches content from a static content server defined by `VITE_CONTENT_BASE_URL`. The content consists of:

1. **manifest.json** - Describes available basemaps and layers with versioning
2. **Basemap PMTiles** - Satellite imagery packaged for offline use
3. **KML Layers** - Geographic overlays (zones, POIs, etc.)

## Content Server Structure

```
{CONTENT_BASE_URL}/
├── manifest.json
├── basemaps/
│   └── erp_sat_v1.pmtiles
└── layers/
    ├── zones.kml
    └── poi.kml
```

## Manifest Format

The `manifest.json` file describes available content:

```json
{
  "version": "2024-01-15T10:30:00Z",
  "basemap": {
    "id": "erp_sat_v1",
    "type": "pmtiles",
    "url": "/basemaps/erp_sat_v1.pmtiles",
    "sha256": "abc123..."
  },
  "layers": [
    {
      "id": "zones",
      "type": "kml",
      "name": "Zones",
      "url": "/layers/zones.kml",
      "sha256": "def456...",
      "defaultVisible": true
    },
    {
      "id": "poi",
      "type": "kml",
      "name": "Points of Interest",
      "url": "/layers/poi.kml",
      "sha256": "ghi789...",
      "defaultVisible": true
    }
  ]
}
```

### Manifest Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | ISO timestamp for cache invalidation |
| `basemap.id` | string | Unique identifier for the basemap |
| `basemap.type` | string | Always "pmtiles" |
| `basemap.url` | string | Path to PMTiles file (relative or absolute) |
| `basemap.sha256` | string | Optional hash for integrity checking |
| `layers[].id` | string | Unique layer identifier |
| `layers[].type` | string | "kml" or "geojson" |
| `layers[].name` | string | Human-readable layer name |
| `layers[].url` | string | Path to layer file |
| `layers[].sha256` | string | Optional hash for change detection |
| `layers[].defaultVisible` | boolean | Whether layer is visible by default |

## Sync Behavior

### On App Start

1. Load cached basemap and layers from IndexedDB immediately
2. Fetch `manifest.json` in parallel (5s timeout)
3. Compare manifest version and layer hashes
4. Download and update changed layers
5. Refresh map with updated layers

### Offline Handling

- If manifest fetch fails, app uses cached content
- Shows "Offline" or "Stale" indicator
- "Sync Now" button attempts re-sync when online

## Versioning Strategy

### Full Update

Increment `manifest.version` when making any content changes:

```json
{
  "version": "2024-01-16T09:00:00Z",
  ...
}
```

### Incremental Layer Updates

Use `sha256` hashes to enable incremental updates:

1. Update a KML file
2. Generate new SHA-256 hash
3. Update manifest with new hash
4. Only clients with different hash download the file

```bash
# Generate SHA-256 hash
sha256sum layers/zones.kml
```

### Basemap Updates

When updating the basemap:

1. Upload new PMTiles file with new version identifier
2. Update `basemap.id` or `basemap.sha256`
3. Users with downloaded basemap will be prompted to download the update

## Hosting Options

### AWS S3 + CloudFront

```bash
# Upload content to S3
aws s3 sync ./content s3://erp-fieldmap-content/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id XXXXXX \
  --paths "/manifest.json"
```

### Netlify (Static Hosting)

1. Create a separate Netlify site for content
2. Deploy content folder
3. Configure CORS headers if on different domain

### Self-Hosted

Any static file server works. Ensure:
- CORS headers allow requests from app domain
- HTTPS is enabled
- Proper cache headers for manifest.json (no-cache recommended)

## CORS Configuration

If content is hosted on a different domain, configure CORS:

```
Access-Control-Allow-Origin: https://erp.fliight.com.au
Access-Control-Allow-Methods: GET
Access-Control-Allow-Headers: Content-Type
```

## KML Layer Guidelines

### Supported Geometry Types

- Points
- LineStrings
- Polygons
- MultiGeometry (converted to multiple features)

### Required Properties

- `name` - Feature name (displayed in popup and labels)
- `description` - Optional description (displayed in popup)

### Example KML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>ERP Zones</name>
    <Placemark>
      <name>Zone A</name>
      <description>Primary operations zone</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              138.6,-34.9,0
              138.7,-34.9,0
              138.7,-34.8,0
              138.6,-34.8,0
              138.6,-34.9,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
```

## Adding Default Bundled KML Layers

You can bundle KML layers directly with the app so they're available on all devices without a content server.

### Method 1: Add to Default Layers (Recommended)

1. **Add your KML file to the public folder:**
   ```
   public/samples/your-layer.kml
   ```

2. **Update the default layers in `src/services/sync.ts`:**
   
   Find the `DEFAULT_LAYERS` array and add your layer:
   
   ```typescript
   const DEFAULT_LAYERS = [
     {
       id: 'namibia-default',
       name: 'Namibia',
       url: '/samples/namibia.kml',
       defaultVisible: true,
     },
     // Add your new layer here:
     {
       id: 'your-layer-id',      // Unique ID (no spaces)
       name: 'Your Layer Name',   // Display name in the app
       url: '/samples/your-layer.kml',  // Path relative to public folder
       defaultVisible: true,      // Show by default on map
     },
   ];
   ```

3. **Rebuild and deploy the app**

The layer will automatically load when users first open the app (if no layers exist in their local storage).

### Method 2: Add via Content Server

If you have a content server configured (`VITE_CONTENT_BASE_URL`), add the layer to your `manifest.json`:

```json
{
  "version": "2024-01-16T10:00:00Z",
  "basemap": { ... },
  "layers": [
    {
      "id": "your-layer",
      "type": "kml",
      "name": "Your Layer",
      "url": "/layers/your-layer.kml",
      "defaultVisible": true
    }
  ]
}
```

### Notes

- **Default layers** are loaded only when IndexedDB has no layers (first app install)
- **Content server layers** override default layers when syncing
- Users can also **upload their own KML files** via the Layer Panel
- Uploaded layers persist in IndexedDB and sync across sessions

### KML File Requirements

- Valid KML 2.2 format
- UTF-8 encoding
- Supported geometry: Point, LineString, Polygon, MultiGeometry
- Each `<Placemark>` should have a `<name>` element

## Troubleshooting

### Layers Not Updating

1. Check manifest.version has changed
2. Verify layer sha256 has changed
3. Check browser console for fetch errors
4. Clear app data and re-sync

### Basemap Not Loading

1. Verify PMTiles URL is accessible
2. Check CORS configuration
3. Ensure PMTiles file is valid (test with pmtiles CLI)
4. Check for sufficient device storage

### Sync Stuck

1. Check network connectivity
2. Verify CONTENT_BASE_URL is correct
3. Check server is responding within 5s timeout
4. Force refresh: clear IndexedDB and reload
