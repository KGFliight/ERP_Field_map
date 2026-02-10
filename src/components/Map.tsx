import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import { useMarkerStore } from '@/stores/markerStore';
import { useMeasureStore } from '@/stores/measureStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateRingOutlinesGeoJSON, generateRingLabelsGeoJSON } from '@/geo';
import type { FeatureCollection, Feature, Point, LineString } from 'geojson';

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

export function Map() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const puckMarkerRef = useRef<maplibregl.Marker | null>(null);
  
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
      if (mode === 'dropPin' || isMeasuring) {
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

  // Render user markers - use a separate effect with idle callback for reliability
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleVersion === 0) return; // Wait for initial style load

    const addMarkerLayers = () => {
      try {
        // Remove existing layers first to ensure clean update
        if (map.getLayer('user-markers-labels')) map.removeLayer('user-markers-labels');
        if (map.getLayer('user-markers-layer')) map.removeLayer('user-markers-layer');
        if (map.getSource('user-markers')) map.removeSource('user-markers');
      } catch (e) {
        console.warn('Error removing marker layers:', e);
      }

      // Only add if we have markers
      if (markers.length === 0) {
        console.log('No markers to add');
        return;
      }
      
      const markerGeoJSON: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: markers.map((m) => ({
          type: 'Feature',
          properties: {
            id: m.id,
            name: m.name,
            color: m.color || '#22d3ee', // Default color fallback
            icon: m.icon || 'pin',
            selected: m.id === selectedMarkerId,
          },
          geometry: {
            type: 'Point',
            coordinates: [m.longitude, m.latitude],
          },
        })),
      };

      console.log('Adding markers:', markers.map(m => ({ id: m.id, lat: m.latitude, lon: m.longitude, color: m.color })));

      try {
        map.addSource('user-markers', {
          type: 'geojson',
          data: markerGeoJSON,
        });

        // Add circle layer with simplified styling for reliability
        map.addLayer({
          id: 'user-markers-layer',
          type: 'circle',
          source: 'user-markers',
          paint: {
            'circle-radius': [
              'case',
              ['==', ['get', 'selected'], true],
              18,
              14
            ],
            'circle-color': ['coalesce', ['get', 'color'], '#22d3ee'],
            'circle-stroke-width': [
              'case',
              ['==', ['get', 'selected'], true],
              4,
              3,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1,
          },
        });

        // Add labels (may fail if glyphs aren't available, but circles will still show)
        try {
          map.addLayer({
            id: 'user-markers-labels',
            type: 'symbol',
            source: 'user-markers',
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 12,
              'text-offset': [0, 2],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1.5,
            },
          });
        } catch (labelError) {
          console.warn('Could not add marker labels:', labelError);
        }
        
        console.log(`Successfully added ${markers.length} markers to map at styleVersion ${styleVersion}`);
        
        // Verify the layer was added
        if (map.getLayer('user-markers-layer')) {
          console.log('Marker layer exists on map');
        } else {
          console.error('Marker layer was NOT added to map!');
        }
      } catch (error) {
        console.error('Error adding marker source/layers:', error);
      }
    };

    // Wait for map to be idle before adding markers
    if (map.isStyleLoaded()) {
      // Small delay to ensure all other layers are added first
      setTimeout(() => {
        addMarkerLayers();
      }, 100);
    } else {
      map.once('style.load', () => {
        setTimeout(() => {
          addMarkerLayers();
        }, 100);
      });
    }
  }, [markers, selectedMarkerId, styleVersion]);

  // Render measurement line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleVersion === 0) return; // Wait for initial style load

    const addMeasureLayers = () => {
      // Remove existing layers first to ensure clean update
      try {
        if (map.getLayer('measure-points-labels')) map.removeLayer('measure-points-labels');
        if (map.getLayer('measure-points-layer')) map.removeLayer('measure-points-layer');
        if (map.getLayer('measure-line-layer')) map.removeLayer('measure-line-layer');
        if (map.getSource('measure-line')) map.removeSource('measure-line');
      } catch (e) {
        console.warn('Error removing measure layers:', e);
      }

      // Only add if we have points
      if (measurePoints.length === 0) {
        console.log('No measurement points to add');
        return;
      }

      const measureGeoJSON: FeatureCollection<LineString | Point> = {
        type: 'FeatureCollection',
        features: [],
      };

      // Add line if we have 2+ points
      if (measurePoints.length >= 2) {
        measureGeoJSON.features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: measurePoints,
          },
        });
      }

      // Add points
      measurePoints.forEach((point, index) => {
        measureGeoJSON.features.push({
          type: 'Feature',
          properties: {
            index: index + 1,
          },
          geometry: {
            type: 'Point',
            coordinates: point,
          },
        } as Feature<Point>);
      });

      console.log('Adding measurement points:', measurePoints);

      try {
        map.addSource('measure-line', {
          type: 'geojson',
          data: measureGeoJSON,
        });

        // Add line layer
        map.addLayer({
          id: 'measure-line-layer',
          type: 'line',
          source: 'measure-line',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#f59e0b',
            'line-width': 5,
            'line-opacity': 1,
          },
        });

        // Add points layer with higher z-order
        map.addLayer({
          id: 'measure-points-layer',
          type: 'circle',
          source: 'measure-line',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 12,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 1,
          },
        });

        // Add labels on top (may fail if glyphs aren't available)
        try {
          map.addLayer({
            id: 'measure-points-labels',
            type: 'symbol',
            source: 'measure-line',
            filter: ['==', '$type', 'Point'],
            layout: {
              'text-field': ['to-string', ['get', 'index']],
              'text-size': 14,
              'text-allow-overlap': true,
            },
            paint: {
              'text-color': '#ffffff',
            },
          });
        } catch (labelError) {
          console.warn('Could not add measure labels:', labelError);
        }
        
        console.log(`Successfully added ${measurePoints.length} measurement points to map`);
        
        // Verify the layers were added
        if (map.getLayer('measure-line-layer') && map.getLayer('measure-points-layer')) {
          console.log('Measurement layers exist on map');
        } else {
          console.error('Measurement layers were NOT added to map!');
        }
      } catch (error) {
        console.error('Error adding measurement source/layers:', error);
      }
    };

    // Wait for map to be idle before adding measurements
    if (map.isStyleLoaded()) {
      // Small delay to ensure all other layers are added first
      setTimeout(() => {
        addMeasureLayers();
      }, 150); // Slightly longer delay than markers to ensure they're on top
    } else {
      map.once('style.load', () => {
        setTimeout(() => {
          addMeasureLayers();
        }, 150);
      });
    }
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

    if (mode === 'dropPin' || isMeasuring) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [mode, isMeasuring]);

  return (
    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
  );
}
