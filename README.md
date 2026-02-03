# ERP Field Map

A production-ready Progressive Web App (PWA) for offline-capable field mapping, built for ERP operations and branded for Flight Technologies.

**Live URL**: https://erp.fliight.com.au

## Features

- **Satellite Basemap**: Offline-capable via packaged PMTiles
- **GPS Position**: Real-time position puck with accuracy ring
- **Heading Indicator**: Smoothed device compass or GPS course-over-ground
- **KML Overlays**: Server-synced layers rendered on the map
- **Drop Pins**: Create, edit, and manage custom markers
- **Measure Distance**: Point-to-point and multi-point polyline measurements
- **Range Rings**: Configurable distance rings (100m, 300m, 1km) around user
- **Offline Mode**: Full functionality with downloaded basemap and cached layers

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Map Engine**: MapLibre GL JS
- **PWA**: Vite PWA Plugin (Workbox)
- **Storage**: IndexedDB via idb
- **State Management**: Zustand
- **Styling**: Tailwind CSS

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/erp-field-map.git
cd erp-field-map

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CONTENT_BASE_URL` | Base URL for content server (manifest, basemaps, layers) | Yes |
| `VITE_ONLINE_SATELLITE_URL` | Fallback satellite tile URL (when offline basemap not downloaded) | No |
| `VITE_MAPTILER_KEY` | MapTiler API key for fallback tiles | No |

### Build

```bash
npm run build
```

Build output is in the `dist/` folder.

## Deployment to Netlify

### Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Via GitHub Integration

1. Push the repository to GitHub
2. Connect the repository in Netlify Dashboard
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Add environment variables in Netlify Dashboard:
   - `VITE_CONTENT_BASE_URL`
   - `VITE_ONLINE_SATELLITE_URL` (optional)
5. Deploy

### Custom Domain

1. Add custom domain `erp.fliight.com.au` in Netlify
2. Configure DNS with your registrar
3. Enable HTTPS (automatic with Netlify)

## Branding

### Logo Files

Place logo images in `/public/brand/`:

- `flight-tech-logo.png` - Flight Technologies logo
- `erp-logo.png` - ERP logo

**Recommended dimensions**: 200px height, transparent PNG

If logos are not present, placeholder text will be shown.

### Customizing Colors

Edit `tailwind.config.js` to modify the color scheme:

```javascript
colors: {
  'field-dark': '#0f172a',
  'field-darker': '#020617',
  'field-accent': '#22d3ee',
  'field-success': '#22c55e',
  'field-warning': '#f59e0b',
  'field-danger': '#ef4444',
}
```

## iOS PWA Notes

### Installation

1. Open Safari on iOS
2. Navigate to https://erp.fliight.com.au
3. Tap the Share button
4. Tap "Add to Home Screen"

### Location Permissions

iOS requires explicit permission for location access:
- Grant "While Using the App" permission when prompted
- For best accuracy, allow "Precise Location"

### Compass/Orientation

On iOS 13+, compass access requires user permission:
- Tap the compass icon when prompted
- Allow "Motion & Orientation Access"

### Background Limitations

iOS PWAs have limitations:
- Location tracking stops when app is backgrounded
- No push notifications
- App may be suspended after 30 seconds in background

## Content Pipeline

See [docs/CONTENT_PIPELINE.md](docs/CONTENT_PIPELINE.md) for details on:
- Publishing `manifest.json`
- Hosting KML layers
- Versioning strategy

## Imagery Pipeline

See [docs/IMAGERY_PIPELINE.md](docs/IMAGERY_PIPELINE.md) for details on:
- Obtaining satellite imagery legally
- Building PMTiles basemaps
- Hosting and distribution

## Project Structure

```
/src
  /components     # React components
  /geo            # Geometry utilities (haversine, circles)
  /hooks          # React hooks (geolocation, heading, sync)
  /services       # IndexedDB, KML parsing, sync
  /stores         # Zustand stores
  /types          # TypeScript types
/public
  /brand          # Logo files
  /icons          # PWA icons
/docs             # Documentation
```

## License

Proprietary - ERP / Flight Technologies
