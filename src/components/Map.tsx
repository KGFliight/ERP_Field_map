import { useEffect, useRef, useCallback } from 'react';
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
        maxzoom: 18,
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22,
      });
    } else if (manifest?.basemap?.url) {
      // Use online PMTiles
      style.sources['basemap'] = {
        type: 'raster',
        tiles: [`pmtiles://${manifest.basemap.url}/{z}/{x}/{y}`],
        tileSize: 256,
        maxzoom: 18,
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22,
      });
    } else {
      // Use online satellite tiles (env var or default Esri World Imagery)
      const onlineSatUrl = import.meta.env.VITE_ONLINE_SATELLITE_URL || DEFAULT_SATELLITE_URL;
      style.sources['basemap'] = {
        type: 'raster',
        tiles: [onlineSatUrl],
        tileSize: 256,
        maxzoom: 18,
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      };
      style.layers.push({
        id: 'basemap-tiles',
        type: 'raster',
        source: 'basemap',
        minzoom: 0,
        maxzoom: 22,
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
      center: [138.6, -34.9], // Default center (Adelaide, Australia)
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.on('load', () => {
      setMap(map);
    });

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
      map.remove();
      mapRef.current = null;
    };
  }, [createStyle, setMap, setPopup, addMarker, selectMarker]);

  // Update basemap when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;

    map.setStyle(createStyle());
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
  }, [layers]);

  // Render user markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const markerGeoJSON: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: markers.map((m) => ({
        type: 'Feature',
        properties: {
          id: m.id,
          name: m.name,
          color: m.color,
          icon: m.icon,
          selected: m.id === selectedMarkerId,
        },
        geometry: {
          type: 'Point',
          coordinates: [m.longitude, m.latitude],
        },
      })),
    };

    if (map.getSource('user-markers')) {
      (map.getSource('user-markers') as maplibregl.GeoJSONSource).setData(markerGeoJSON);
    } else {
      map.addSource('user-markers', {
        type: 'geojson',
        data: markerGeoJSON,
      });

      map.addLayer({
        id: 'user-markers-layer',
        type: 'circle',
        source: 'user-markers',
        paint: {
          'circle-radius': [
            'case',
            ['get', 'selected'],
            14,
            10,
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': [
            'case',
            ['get', 'selected'],
            3,
            2,
          ],
          'circle-stroke-color': '#fff',
        },
      });

      map.addLayer({
        id: 'user-markers-labels',
        type: 'symbol',
        source: 'user-markers',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': '#000',
          'text-halo-width': 1,
        },
      });
    }
  }, [markers, selectedMarkerId]);

  // Render measurement line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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

    const addMeasureLayers = () => {
      if (map.getSource('measure-line')) {
        (map.getSource('measure-line') as maplibregl.GeoJSONSource).setData(measureGeoJSON);
      } else {
        map.addSource('measure-line', {
          type: 'geojson',
          data: measureGeoJSON,
        });

        map.addLayer({
          id: 'measure-line-layer',
          type: 'line',
          source: 'measure-line',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': '#f59e0b',
            'line-width': 4,
          },
        });

        map.addLayer({
          id: 'measure-points-layer',
          type: 'circle',
          source: 'measure-line',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 10,
            'circle-color': '#f59e0b',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff',
          },
        });

        map.addLayer({
          id: 'measure-points-labels',
          type: 'symbol',
          source: 'measure-line',
          filter: ['==', '$type', 'Point'],
          layout: {
            'text-field': ['to-string', ['get', 'index']],
            'text-size': 12,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#fff',
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      addMeasureLayers();
    } else {
      map.once('style.load', addMeasureLayers);
    }
  }, [measurePoints]);

  // Render range rings
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !position) return;

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
      (map.getSource('range-ring-labels') as maplibregl.GeoJSONSource).setData(labelsGeoJSON);
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
          'line-color': 'rgba(255, 255, 255, 0.5)',
          'line-width': 1.5,
          'line-dasharray': [4, 4],
        },
      });

      map.addLayer({
        id: 'range-ring-labels-layer',
        type: 'symbol',
        source: 'range-ring-labels',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.5],
        },
        paint: {
          'text-color': 'rgba(255, 255, 255, 0.8)',
          'text-halo-color': 'rgba(0, 0, 0, 0.7)',
          'text-halo-width': 1,
        },
        minzoom: 12, // Hide labels at low zoom
      });
    }
  }, [position, ringsEnabled, ringConfig]);

  // Render distance line to selected marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

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
          'line-width': 2,
          'line-dasharray': [3, 3],
        },
      });
    }
  }, [position, markers, selectedMarkerId]);

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
