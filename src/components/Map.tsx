import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import { useMarkerStore } from '@/stores/markerStore';
import { useMeasureStore } from '@/stores/measureStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { generateRingOutlinesGeoJSON, generateRingLabelsGeoJSON } from '@/geo';
import type { FeatureCollection, Feature, Point, LineString } from 'geojson';
import type { TrainingAssetType, DrawingStroke } from '@/types';

// Register PMTiles protocol
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// Colors for different geometry types
const LAYER_COLORS = {
  polygon: {
    fill: 'rgba(34, 211, 238, 0.2)',
    stroke: '#22d3ee',
  },
  line: '#f59e0b',
  point: '#22c55e',
};

// Range ring radii in meters
const RING_RADII = {
  ring100m: 100,
  ring300m: 300,
  ring1000m: 1000,
};

// Training asset icons
const TRAINING_ASSET_ICONS: Record<TrainingAssetType, string> = {
  poacher: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  poacher_armed: 'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-3-3l3 3 3-3',
  poacher_vehicle: 'M8 17h8M5 11h14l-1.5-6H6.5L5 11zm0 0v4a1 1 0 001 1h1m12-5v4a1 1 0 01-1 1h-1M7 16h.01M17 16h.01',
  snare: 'M12 15a3 3 0 100-6 3 3 0 000 6zm0 0v5m-3-2l3 2 3-2M9 6l3 3 3-3',
  injured_animal: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  ranger: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  ranger_team: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  vehicle: 'M8 17h8M5 11h14l-1.5-6H6.5L5 11zm0 0v4a1 1 0 001 1h1m12-5v4a1 1 0 01-1 1h-1M7 16h.01M17 16h.01',
  helicopter: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  base_camp: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8',
  checkpoint: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
};

export function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const puckMarkerRef = useRef<maplibregl.Marker | null>(null);
  // Store HTML-based markers for user pins
  const userMarkersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  // Store HTML-based markers for measurement points
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]);
  // Store HTML-based markers for training assets
  const trainingMarkersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  // Store cluster markers
  const clusterMarkersRef = useRef<globalThis.Map<string, maplibregl.Marker>>(new globalThis.Map());
  // Track expanded clusters
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  // Drawing canvas ref
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<[number, number][]>([]);
  
  // Track style version to trigger layer re-creation after style changes
  const [styleVersion, setStyleVersion] = useState(0);

  const {
    setMap,
    position,
    heading,
    followMode,
    layers,
    hasOfflineBasemap,
    basemapBlob,
    setPopup,
  } = useMapStore();

  const { manifest } = useSyncStore();
  const { markers, selectedMarkerId, mode, addMarker, selectMarker } = useMarkerStore();
  const { isActive: isMeasuring, points: measurePoints } = useMeasureStore();
  const { ringsEnabled, ringConfig } = useSettingsStore();
  const {
    isTrainingMode,
    trainingAssets,
    placementMode,
    selectedAssetId,
    isDrawingMode,
    isDeleteMode,
    drawingStrokes,
    selectedStrokeId,
    currentDrawingColor,
    addDrawingStroke,
    selectStroke,
  } = useTrainingStore();

  // Default Esri World Imagery URL (free with attribution)
  const DEFAULT_SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Esri source max zoom - tiles don't exist beyond this
  const ESRI_SOURCE_MAX_ZOOM = 19;

  // Create the map style with basemap
  const createStyle = useCallback((): maplibregl.StyleSpecification => {
    const style: maplibregl.StyleSpecification = {
      version: 8,
      name: 'ERP Field Map',
      // Glyphs are required for text labels
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#1a1a2e',
          },
        },
      ],
    };

    // Add basemap source
    if (hasOfflineBasemap && basemapBlob) {
      // Create object URL for the blob
      const blobUrl = URL.createObjectURL(basemapBlob);
      style.sources['basemap'] = {
        type: 'raster',
        tiles: [`pmtiles://${blobUrl}/{z}/{x}/{y}`],
        tileSize: 256,
        maxzoom: 19, // Source max zoom - tiles at this level will be used for higher zooms
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22, // Allow some overzooming (tiles will stretch)
      });
    } else if (manifest?.basemap?.url) {
      // Use online PMTiles
      style.sources['basemap'] = {
        type: 'raster',
        tiles: [`pmtiles://${manifest.basemap.url}/{z}/{x}/{y}`],
        tileSize: 256,
        maxzoom: 19, // Source max zoom
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22, // Allow some overzooming
      });
    } else {
      // Use online satellite tiles (env var or default Esri World Imagery)
      const onlineSatUrl = import.meta.env.VITE_ONLINE_SATELLITE_URL || DEFAULT_SATELLITE_URL;
      style.sources['basemap'] = {
        type: 'raster',
        tiles: [onlineSatUrl],
        tileSize: 256,
        maxzoom: ESRI_SOURCE_MAX_ZOOM, // Esri source max - tiles will be reused at higher zooms
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22, // Allow overzooming - highest available tiles will stretch
      });
    }

    return style;
  }, [hasOfflineBasemap, basemapBlob, manifest]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createStyle(),
      center: [17.1, -22.6], // Default center (Namibia area)
      zoom: 14,
      maxZoom: 19, // Limit to tile source max zoom to prevent "Map data not available"
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.on('load', () => {
      setMap(map);
      // Force resize after map loads to ensure correct dimensions
      setTimeout(() => map.resize(), 50);
      setTimeout(() => map.resize(), 200);
      setTimeout(() => map.resize(), 500);
      // Increment style version to trigger layer creation
      setStyleVersion(v => v + 1);
    });

    // Handle resize for orientation changes - use multiple delays for reliability
    const handleResize = () => {
      // Immediate resize
      map.resize();
      // Delayed resizes to catch layout changes
      setTimeout(() => map.resize(), 50);
      setTimeout(() => map.resize(), 150);
      setTimeout(() => map.resize(), 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial resize after a short delay to catch any layout issues
    setTimeout(() => map.resize(), 100);
    setTimeout(() => map.resize(), 300);
    setTimeout(() => map.resize(), 600);

    // Also handle visibility change to fix display after app switch
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Multiple resize attempts when becoming visible
        map.resize();
        setTimeout(() => map.resize(), 50);
        setTimeout(() => map.resize(), 150);
        setTimeout(() => map.resize(), 300);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle map clicks based on mode
    map.on('click', (e) => {
      const { mode } = useMarkerStore.getState();
      const { isActive: isMeasuring } = useMeasureStore.getState();
      const trainingState = useTrainingStore.getState();

      // Handle training mode placement - must check conditions carefully
      if (trainingState.isTrainingMode && 
          trainingState.selectedAssetType && 
          (trainingState.placementMode === 'target' || trainingState.placementMode === 'friendly')) {
        const category = trainingState.placementMode as 'target' | 'friendly';
        trainingState.addTrainingAsset(
          e.lngLat.lat,
          e.lngLat.lng,
          trainingState.selectedAssetType,
          category
        );
        return;
      }

      // Handle measure mode
      if (isMeasuring) {
        useMeasureStore.getState().addPoint(e.lngLat.lng, e.lngLat.lat);
        return;
      }

      // Handle drop pin mode
      if (mode === 'dropPin') {
        addMarker(e.lngLat.lat, e.lngLat.lng);
        return;
      }

      // Check for user marker clicks (only if layer exists)
      if (map.getLayer('user-markers-layer')) {
        const userMarkerFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['user-markers-layer'],
        });
        if (userMarkerFeatures.length > 0) {
          const markerId = userMarkerFeatures[0].properties?.id;
          if (markerId) {
            selectMarker(markerId);
            return;
          }
        }
      }

      // Check for overlay feature clicks
      const features = map.queryRenderedFeatures(e.point);
      const clickedFeature = features.find(
        (f) =>
          f.source.startsWith('layer-') &&
          f.properties?.name
      );

      if (clickedFeature) {
        setPopup({
          name: clickedFeature.properties?.name || 'Unknown',
          description: clickedFeature.properties?.description || '',
          coordinates: [e.lngLat.lng, e.lngLat.lat],
          properties: clickedFeature.properties || {},
        });
      } else {
        setPopup(null);
        selectMarker(null);
      }
    });

    // Change cursor based on mode
    map.on('mousemove', () => {
      const { mode } = useMarkerStore.getState();
      const { isActive: isMeasuring } = useMeasureStore.getState();
      const trainingState = useTrainingStore.getState();
      
      if (mode === 'dropPin' || isMeasuring || 
          (trainingState.isTrainingMode && trainingState.placementMode !== 'none')) {
        map.getCanvas().style.cursor = 'crosshair';
      } else {
        map.getCanvas().style.cursor = '';
      }
    });

    mapRef.current = map;

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      map.remove();
      mapRef.current = null;
    };
  }, [createStyle, setMap, setPopup, addMarker, selectMarker]);

  // Update basemap when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    // Set new style - this removes all layers
    map.setStyle(createStyle());
    
    // When style loads, increment version to trigger layer re-creation
    map.once('style.load', () => {
      setStyleVersion(v => v + 1);
    });
  }, [hasOfflineBasemap, basemapBlob, createStyle]);

  // Add/update overlay layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    // Wait for style to be loaded
    const addLayers = () => {
      layers.forEach((layerData, layerId) => {
        const sourceId = `layer-${layerId}`;

        // Add or update source
        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(
            layerData.geojson
          );
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: layerData.geojson,
          });

          // Add polygon layer
          map.addLayer({
            id: `${sourceId}-polygons`,
            type: 'fill',
            source: sourceId,
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'fill-color': LAYER_COLORS.polygon.fill,
              'fill-outline-color': LAYER_COLORS.polygon.stroke,
            },
            layout: {
              visibility: layerData.visible ? 'visible' : 'none',
            },
          });

          // Add polygon outline
          map.addLayer({
            id: `${sourceId}-polygon-outlines`,
            type: 'line',
            source: sourceId,
            filter: ['==', '$type', 'Polygon'],
            paint: {
              'line-color': LAYER_COLORS.polygon.stroke,
              'line-width': 2,
            },
            layout: {
              visibility: layerData.visible ? 'visible' : 'none',
            },
          });

          // Add line layer
          map.addLayer({
            id: `${sourceId}-lines`,
            type: 'line',
            source: sourceId,
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-color': LAYER_COLORS.line,
              'line-width': 3,
            },
            layout: {
              visibility: layerData.visible ? 'visible' : 'none',
            },
          });

          // Add point layer
          map.addLayer({
            id: `${sourceId}-points`,
            type: 'circle',
            source: sourceId,
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-radius': 8,
              'circle-color': LAYER_COLORS.point,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
            layout: {
              visibility: layerData.visible ? 'visible' : 'none',
            },
          });

          // Add labels for points
          map.addLayer({
            id: `${sourceId}-labels`,
            type: 'symbol',
            source: sourceId,
            filter: ['==', '$type', 'Point'],
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              visibility: layerData.visible ? 'visible' : 'none',
            },
            paint: {
              'text-color': '#fff',
              'text-halo-color': '#000',
              'text-halo-width': 1,
            },
          });
        }
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once('style.load', addLayers);
    }
  }, [layers, styleVersion]);

  // Render user markers using HTML-based MapLibre Markers (more reliable than GeoJSON layers)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingMarkers = userMarkersRef.current;
    const currentMarkerIds = new Set(markers.map(m => m.id));

    // Remove markers that no longer exist
    existingMarkers.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        existingMarkers.delete(id);
      }
    });

    // Add or update markers
    markers.forEach((m) => {
      const isSelected = m.id === selectedMarkerId;
      const color = m.color || '#22d3ee';
      
      if (existingMarkers.has(m.id)) {
        // Update existing marker position
        const marker = existingMarkers.get(m.id)!;
        marker.setLngLat([m.longitude, m.latitude]);
        
        // Update marker element styling for selection state
        const el = marker.getElement();
        if (el) {
          const inner = el.querySelector('.user-marker-inner') as HTMLElement;
          if (inner) {
            inner.style.backgroundColor = color;
            inner.style.width = isSelected ? '28px' : '24px';
            inner.style.height = isSelected ? '28px' : '24px';
            inner.style.borderWidth = isSelected ? '4px' : '3px';
          }
        }
      } else {
        // Create new marker element
        const el = document.createElement('div');
        el.className = 'user-marker-container';
        el.style.cssText = 'cursor: pointer;';
        el.innerHTML = `
          <div class="user-marker-inner" style="
            width: ${isSelected ? '28px' : '24px'};
            height: ${isSelected ? '28px' : '24px'};
            background-color: ${color};
            border: ${isSelected ? '4px' : '3px'} solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>
        `;
        
        // Click handler for selection
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          selectMarker(m.id);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([m.longitude, m.latitude])
          .addTo(map);

        existingMarkers.set(m.id, marker);
      }
    });

    console.log(`Markers: ${markers.length} HTML markers on map`);

    // Cleanup on unmount
    return () => {
      // Don't remove markers on effect cleanup, only on unmount
    };
  }, [markers, selectedMarkerId, selectMarker]);

  // Cluster nearby training assets
  const clusterAssets = useCallback((assets: typeof trainingAssets, map: maplibregl.Map) => {
    const CLUSTER_RADIUS = 60; // pixels
    const clusters: { id: string; assets: typeof trainingAssets; center: [number, number] }[] = [];
    const clustered = new Set<string>();

    assets.forEach((asset) => {
      if (clustered.has(asset.id)) return;

      const point = map.project([asset.longitude, asset.latitude]);
      const clusterAssets = [asset];
      clustered.add(asset.id);

      // Find nearby assets
      assets.forEach((other) => {
        if (clustered.has(other.id)) return;
        const otherPoint = map.project([other.longitude, other.latitude]);
        const distance = Math.sqrt(
          Math.pow(point.x - otherPoint.x, 2) + Math.pow(point.y - otherPoint.y, 2)
        );
        if (distance < CLUSTER_RADIUS) {
          clusterAssets.push(other);
          clustered.add(other.id);
        }
      });

      // Calculate cluster center
      const avgLng = clusterAssets.reduce((sum, a) => sum + a.longitude, 0) / clusterAssets.length;
      const avgLat = clusterAssets.reduce((sum, a) => sum + a.latitude, 0) / clusterAssets.length;

      clusters.push({
        id: clusterAssets.map(a => a.id).sort().join('|'),
        assets: clusterAssets,
        center: [avgLng, avgLat],
      });
    });

    return clusters;
  }, []);

  // Render training assets with clustering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isTrainingMode) {
      // Clear all training markers when not in training mode
      trainingMarkersRef.current.forEach((marker) => marker.remove());
      trainingMarkersRef.current.clear();
      clusterMarkersRef.current.forEach((marker) => marker.remove());
      clusterMarkersRef.current.clear();
      return;
    }

    // Calculate clusters
    const clusters = clusterAssets(trainingAssets, map);
    
    // Track which markers should exist
    const neededIndividualIds = new Set<string>();
    const neededClusterIds = new Set<string>();

    clusters.forEach((cluster) => {
      const isExpanded = expandedClusterId === cluster.id;
      
      if (cluster.assets.length === 1) {
        // Single asset - show individual marker
        const asset = cluster.assets[0];
        neededIndividualIds.add(asset.id);

        const existingMarker = trainingMarkersRef.current.get(asset.id);
        
        if (!existingMarker) {
          const isTarget = asset.category === 'target';
          const bgColor = isTarget ? '#ef4444' : '#22c55e';
          const borderColor = isTarget ? '#fca5a5' : '#86efac';
          const icon = TRAINING_ASSET_ICONS[asset.type] || TRAINING_ASSET_ICONS.ranger;
          const typeLabel = asset.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

          const el = document.createElement('div');
          el.className = 'training-marker';
          el.dataset.assetId = asset.id;
          el.innerHTML = `
            <div class="training-marker-inner" style="
              width: 40px;
              height: 40px;
              background-color: ${bgColor};
              border: 3px dashed ${borderColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="${icon}" />
              </svg>
            </div>
            <div class="training-marker-label" style="
              background: ${isTarget ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)'};
            ">${typeLabel}</div>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            useTrainingStore.getState().selectAsset(asset.id);
          });

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat([asset.longitude, asset.latitude])
            .addTo(map);

          trainingMarkersRef.current.set(asset.id, marker);
        }
      } else {
        // Multiple assets - show cluster marker (collapsed or expanded)
        neededClusterIds.add(cluster.id);
        
        // Always recreate when expanded state changes
        const existingCluster = clusterMarkersRef.current.get(cluster.id);
        if (existingCluster) {
          existingCluster.remove();
          clusterMarkersRef.current.delete(cluster.id);
        }
        
        // Count targets and friendlies in cluster
        const targetCount = cluster.assets.filter(a => a.category === 'target').length;
        const friendlyCount = cluster.assets.filter(a => a.category === 'friendly').length;
        const total = cluster.assets.length;
        
        // Determine cluster color based on contents
        let clusterBg = '#6366f1'; // purple for mixed
        if (targetCount === total) clusterBg = '#ef4444'; // red for all targets
        if (friendlyCount === total) clusterBg = '#22c55e'; // green for all friendlies
        
        // Create cluster element
        const el = document.createElement('div');
        el.className = 'training-cluster';
        
        if (isExpanded) {
          // Expanded view with dropdown list
          const assetListHtml = cluster.assets.map((asset) => {
            const isTarget = asset.category === 'target';
            const bgColor = isTarget ? '#ef4444' : '#22c55e';
            const icon = TRAINING_ASSET_ICONS[asset.type] || TRAINING_ASSET_ICONS.ranger;
            const typeLabel = asset.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `
              <div class="cluster-asset-item" data-asset-id="${asset.id}" style="
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: rgba(15, 23, 42, 0.95);
                border-left: 3px solid ${bgColor};
                cursor: pointer;
                transition: background 0.15s;
              ">
                <div style="
                  width: 24px;
                  height: 24px;
                  background: ${bgColor};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="${icon}" />
                  </svg>
                </div>
                <span style="color: white; font-size: 11px; font-weight: 500;">${typeLabel}</span>
              </div>
            `;
          }).join('');
          
          el.innerHTML = `
            <div class="training-cluster-inner" style="
              width: 44px;
              height: 44px;
              background: ${clusterBg};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 12px rgba(0,0,0,0.5);
              cursor: pointer;
              position: relative;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div class="cluster-dropdown" style="
              position: absolute;
              top: 100%;
              left: 50%;
              transform: translateX(-50%);
              margin-top: 8px;
              background: rgba(2, 6, 23, 0.95);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 8px;
              overflow: hidden;
              min-width: 140px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            ">
              <div style="
                padding: 6px 10px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-size: 9px;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
                letter-spacing: 0.5px;
              ">${total} Assets</div>
              ${assetListHtml}
            </div>
          `;
          
          // Add click handler to close
          const innerEl = el.querySelector('.training-cluster-inner');
          if (innerEl) {
            innerEl.addEventListener('click', (e) => {
              e.stopPropagation();
              setExpandedClusterId(null);
            });
          }
          
          // Add click handlers to each asset item
          el.querySelectorAll('.cluster-asset-item').forEach((item) => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              const assetId = (item as HTMLElement).dataset.assetId;
              if (assetId) {
                useTrainingStore.getState().selectAsset(assetId);
              }
            });
            item.addEventListener('mouseenter', () => {
              (item as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
            });
            item.addEventListener('mouseleave', () => {
              (item as HTMLElement).style.background = 'rgba(15, 23, 42, 0.95)';
            });
          });
        } else {
          // Collapsed view
          el.innerHTML = `
            <div class="training-cluster-inner" style="
              width: 50px;
              height: 50px;
              background: ${clusterBg};
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 12px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              <span style="color: white; font-weight: bold; font-size: 16px;">${total}</span>
              <span style="color: white; font-size: 8px; text-transform: uppercase;">Assets</span>
            </div>
            <div class="training-cluster-label" style="
              background: rgba(0,0,0,0.85);
              color: white;
              font-size: 9px;
              padding: 4px 8px;
              border-radius: 4px;
              margin-top: 4px;
              white-space: nowrap;
              text-align: center;
              max-width: 120px;
            ">
              ${targetCount > 0 ? `<span style="color: #fca5a5;">${targetCount} target${targetCount > 1 ? 's' : ''}</span>` : ''}
              ${targetCount > 0 && friendlyCount > 0 ? ' • ' : ''}
              ${friendlyCount > 0 ? `<span style="color: #86efac;">${friendlyCount} friendly</span>` : ''}
            </div>
          `;

          const clusterId = cluster.id;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setExpandedClusterId(clusterId);
          });
        }

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'top',
        })
          .setLngLat(cluster.center)
          .addTo(map);

        clusterMarkersRef.current.set(cluster.id, marker);
      }
    });

    // Remove markers that are no longer needed
    trainingMarkersRef.current.forEach((marker, id) => {
      if (!neededIndividualIds.has(id)) {
        marker.remove();
        trainingMarkersRef.current.delete(id);
      }
    });

    clusterMarkersRef.current.forEach((marker, id) => {
      if (!neededClusterIds.has(id)) {
        marker.remove();
        clusterMarkersRef.current.delete(id);
      }
    });
  }, [trainingAssets, isTrainingMode, expandedClusterId, clusterAssets]);

  // Re-cluster on zoom change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isTrainingMode) return;

    const handleZoom = () => {
      // Reset expanded cluster on zoom
      setExpandedClusterId(null);
    };

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [isTrainingMode]);

  // Update training marker selection styling separately
  useEffect(() => {
    trainingMarkersRef.current.forEach((marker, id) => {
      const el = marker.getElement();
      if (el) {
        const isSelected = id === selectedAssetId;
        // Apply transform to inner element, not wrapper (MapLibre uses transform for positioning)
        const inner = el.querySelector('.training-marker-inner') as HTMLElement;
        if (inner) {
          inner.style.transform = isSelected ? 'scale(1.15)' : 'scale(1)';
        }
        el.style.zIndex = isSelected ? '100' : '1';
      }
    });
  }, [selectedAssetId]);

  // Render measurement line and points using HTML markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old measurement markers
    measureMarkersRef.current.forEach(marker => marker.remove());
    measureMarkersRef.current = [];

    // Remove existing line layer
    try {
      if (map.getLayer('measure-line-layer')) map.removeLayer('measure-line-layer');
      if (map.getSource('measure-line')) map.removeSource('measure-line');
    } catch {
      // Ignore removal errors
    }

    // Only add if we have points
    if (measurePoints.length === 0) {
      return;
    }

    // Add line if we have 2+ points (using GeoJSON layer for the line)
    if (measurePoints.length >= 2 && map.isStyleLoaded()) {
      const lineGeoJSON: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: measurePoints,
          },
        }],
      };

      try {
        map.addSource('measure-line', {
          type: 'geojson',
          data: lineGeoJSON,
        });

        map.addLayer({
          id: 'measure-line-layer',
          type: 'line',
          source: 'measure-line',
          paint: {
            'line-color': '#f59e0b',
            'line-width': 5,
            'line-opacity': 1,
          },
        });
      } catch (error) {
        console.error('Error adding measurement line:', error);
      }
    }

    // Add HTML markers for points
    measurePoints.forEach((point, index) => {
      const el = document.createElement('div');
      el.className = 'measure-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background-color: #f59e0b;
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      `;
      el.textContent = String(index + 1);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([point[0], point[1]])
        .addTo(map);

      measureMarkersRef.current.push(marker);
    });

    console.log(`Measurements: ${measurePoints.length} points on map`);
  }, [measurePoints, isMeasuring, styleVersion]);

  // Render range rings
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const addRingLayers = () => {
      // Get enabled radii
      const enabledRadii: number[] = [];
      if (ringsEnabled) {
        if (ringConfig.ring100m) enabledRadii.push(RING_RADII.ring100m);
        if (ringConfig.ring300m) enabledRadii.push(RING_RADII.ring300m);
        if (ringConfig.ring1000m) enabledRadii.push(RING_RADII.ring1000m);
      }

      const ringsGeoJSON = generateRingOutlinesGeoJSON(
        position.latitude,
        position.longitude,
        enabledRadii
      );

      const labelsGeoJSON = generateRingLabelsGeoJSON(
        position.latitude,
        position.longitude,
        enabledRadii,
        0 // Labels at north
      );

      if (map.getSource('range-rings')) {
        (map.getSource('range-rings') as maplibregl.GeoJSONSource).setData(ringsGeoJSON);
        if (map.getSource('range-ring-labels')) {
          (map.getSource('range-ring-labels') as maplibregl.GeoJSONSource).setData(labelsGeoJSON);
        }
        
        // Re-add layers if they don't exist
        if (!map.getLayer('range-rings-layer')) {
          map.addLayer({
            id: 'range-rings-layer',
            type: 'line',
            source: 'range-rings',
            paint: {
              'line-color': 'rgba(255, 255, 255, 0.7)',
              'line-width': 2,
              'line-dasharray': [4, 4],
            },
          });
        }
        
        if (!map.getLayer('range-ring-labels-layer') && map.getSource('range-ring-labels')) {
          map.addLayer({
            id: 'range-ring-labels-layer',
            type: 'symbol',
            source: 'range-ring-labels',
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-anchor': 'bottom',
              'text-offset': [0, -0.5],
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': 'rgba(255, 255, 255, 0.9)',
              'text-halo-color': 'rgba(0, 0, 0, 0.8)',
              'text-halo-width': 1.5,
            },
            minzoom: 10,
          });
        }
      } else {
        map.addSource('range-rings', {
          type: 'geojson',
          data: ringsGeoJSON,
        });

        map.addSource('range-ring-labels', {
          type: 'geojson',
          data: labelsGeoJSON,
        });

        map.addLayer({
          id: 'range-rings-layer',
          type: 'line',
          source: 'range-rings',
          paint: {
            'line-color': 'rgba(255, 255, 255, 0.7)',
            'line-width': 2,
            'line-dasharray': [4, 4],
          },
        });

        map.addLayer({
          id: 'range-ring-labels-layer',
          type: 'symbol',
          source: 'range-ring-labels',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 12,
            'text-anchor': 'bottom',
            'text-offset': [0, -0.5],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': 'rgba(255, 255, 255, 0.9)',
            'text-halo-color': 'rgba(0, 0, 0, 0.8)',
            'text-halo-width': 1.5,
          },
          minzoom: 10,
        });
      }
    };

    if (map.isStyleLoaded()) {
      addRingLayers();
    } else {
      map.once('style.load', addRingLayers);
    }
  }, [position, ringsEnabled, ringConfig, styleVersion]);

  // Render distance line to selected marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addDistanceLine = () => {
      const selectedMarker = markers.find((m) => m.id === selectedMarkerId);
      
      let lineGeoJSON: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: [],
      };

      if (position && selectedMarker) {
        lineGeoJSON.features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [position.longitude, position.latitude],
              [selectedMarker.longitude, selectedMarker.latitude],
            ],
          },
        });
      }

      if (map.getSource('distance-line')) {
        (map.getSource('distance-line') as maplibregl.GeoJSONSource).setData(lineGeoJSON);
        
        // Re-add layer if it doesn't exist
        if (!map.getLayer('distance-line-layer')) {
          map.addLayer({
            id: 'distance-line-layer',
            type: 'line',
            source: 'distance-line',
            paint: {
              'line-color': '#22d3ee',
              'line-width': 3,
              'line-dasharray': [3, 3],
            },
          });
        }
      } else {
        map.addSource('distance-line', {
          type: 'geojson',
          data: lineGeoJSON,
        });

        map.addLayer({
          id: 'distance-line-layer',
          type: 'line',
          source: 'distance-line',
          paint: {
            'line-color': '#22d3ee',
            'line-width': 3,
            'line-dasharray': [3, 3],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      addDistanceLine();
    } else {
      map.once('style.load', addDistanceLine);
    }
  }, [position, markers, selectedMarkerId, styleVersion]);

  // Update position puck
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const { latitude, longitude, accuracy } = position;

    // Create or update puck marker
    if (!puckMarkerRef.current) {
      // Create puck element
      const puckEl = document.createElement('div');
      puckEl.className = 'position-puck';
      puckEl.innerHTML = `
        <div class="puck-outer"></div>
        <div class="puck-inner"></div>
        <div class="puck-heading"></div>
      `;

      puckMarkerRef.current = new maplibregl.Marker({
        element: puckEl,
        rotationAlignment: 'map',
        pitchAlignment: 'map',
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      puckMarkerRef.current.setLngLat([longitude, latitude]);
    }

    // Update accuracy circle
    const circleGeoJSON: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { accuracy },
          geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        } as Feature<Point>,
      ],
    };

    if (map.getSource('accuracy-circle')) {
      (map.getSource('accuracy-circle') as maplibregl.GeoJSONSource).setData(
        circleGeoJSON
      );
    } else if (map.isStyleLoaded()) {
      map.addSource('accuracy-circle', {
        type: 'geojson',
        data: circleGeoJSON,
      });

      map.addLayer(
        {
          id: 'accuracy-circle-layer',
          type: 'circle',
          source: 'accuracy-circle',
          paint: {
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              0,
              0,
              20,
              ['/', ['get', 'accuracy'], 0.075],
            ],
            'circle-color': 'rgba(34, 211, 238, 0.15)',
            'circle-stroke-width': 1,
            'circle-stroke-color': 'rgba(34, 211, 238, 0.5)',
          },
        },
        // Add below other layers
        undefined
      );
    }

    // Center map if follow mode
    if (followMode) {
      map.easeTo({
        center: [longitude, latitude],
        duration: 500,
      });
    }
  }, [position, followMode]);

  // Update heading
  useEffect(() => {
    if (!puckMarkerRef.current || heading === null) return;

    const puckEl = puckMarkerRef.current.getElement();
    const headingEl = puckEl.querySelector('.puck-heading') as HTMLElement;
    if (headingEl) {
      // Rotate from default (pointing up/north = 0°) to actual heading
      headingEl.style.transform = `rotate(${heading.heading}deg)`;
      headingEl.style.opacity = '1';
    }
  }, [heading]);

  // Update cursor based on mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const trainingState = useTrainingStore.getState();
    if (mode === 'dropPin' || isMeasuring || 
        (trainingState.isTrainingMode && trainingState.placementMode !== 'none')) {
      map.getCanvas().style.cursor = 'crosshair';
    } else if (trainingState.isDrawingMode) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [mode, isMeasuring, isDrawingMode, placementMode, isTrainingMode]);

  // Handle drawing canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const map = mapRef.current;
    if (!canvas || !map) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match container
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawStrokes();
      }
    };

    // Redraw all strokes
    const redrawStrokes = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawingStrokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        
        const isSelected = stroke.id === selectedStrokeId;
        
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = isSelected ? stroke.width + 4 : stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (isSelected) {
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = 10;
        } else {
          ctx.shadowBlur = 0;
        }

        // Convert geo coordinates to pixel coordinates
        stroke.points.forEach((point, index) => {
          const pixel = map.project([point[0], point[1]]);
          if (index === 0) {
            ctx.moveTo(pixel.x, pixel.y);
          } else {
            ctx.lineTo(pixel.x, pixel.y);
          }
        });
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Redraw on map move/zoom
    map.on('move', redrawStrokes);
    map.on('zoom', redrawStrokes);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      map.off('move', redrawStrokes);
      map.off('zoom', redrawStrokes);
    };
  }, [drawingStrokes, selectedStrokeId]);

  // Handle drawing interactions
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode || !mapRef.current) return;
    
    isDrawingRef.current = true;
    currentStrokeRef.current = [];
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const lngLat = mapRef.current.unproject([x, y]);
    currentStrokeRef.current.push([lngLat.lng, lngLat.lat]);
  }, [isDrawingMode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !isDrawingMode || !mapRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const lngLat = mapRef.current.unproject([x, y]);
    currentStrokeRef.current.push([lngLat.lng, lngLat.lat]);
    
    // Draw current stroke
    if (currentStrokeRef.current.length >= 2) {
      const points = currentStrokeRef.current;
      const prevPoint = points[points.length - 2];
      const currPoint = points[points.length - 1];
      
      const prevPixel = mapRef.current.project([prevPoint[0], prevPoint[1]]);
      const currPixel = mapRef.current.project([currPoint[0], currPoint[1]]);
      
      ctx.beginPath();
      ctx.strokeStyle = currentDrawingColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(prevPixel.x, prevPixel.y);
      ctx.lineTo(currPixel.x, currPixel.y);
      ctx.stroke();
    }
  }, [isDrawingMode, currentDrawingColor]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawingRef.current || currentStrokeRef.current.length < 2) {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
      return;
    }
    
    const stroke: DrawingStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: [...currentStrokeRef.current],
      color: currentDrawingColor,
      width: 4,
    };
    
    addDrawingStroke(stroke);
    isDrawingRef.current = false;
    currentStrokeRef.current = [];
  }, [currentDrawingColor, addDrawingStroke]);

  // Handle stroke selection for delete mode
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!isDeleteMode || !mapRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find closest stroke
    let closestStrokeId: string | null = null;
    let minDistance = Infinity;
    
    drawingStrokes.forEach((stroke) => {
      stroke.points.forEach((point) => {
        const pixel = mapRef.current!.project([point[0], point[1]]);
        const dist = Math.sqrt((pixel.x - x) ** 2 + (pixel.y - y) ** 2);
        if (dist < minDistance && dist < 20) {
          minDistance = dist;
          closestStrokeId = stroke.id;
        }
      });
    });
    
    selectStroke(closestStrokeId);
  }, [isDeleteMode, drawingStrokes, selectStroke]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      
      {/* Drawing canvas overlay */}
      {isTrainingMode && (isDrawingMode || isDeleteMode || drawingStrokes.length > 0) && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            pointerEvents: isDrawingMode || isDeleteMode ? 'auto' : 'none',
            touchAction: isDrawingMode ? 'none' : 'auto',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={handleCanvasMouseDown}
          onTouchMove={handleCanvasMouseMove}
          onTouchEnd={handleCanvasMouseUp}
          onClick={handleCanvasClick}
        />
      )}
    </div>
  );
}
