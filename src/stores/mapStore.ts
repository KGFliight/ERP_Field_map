import { create } from 'zustand';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { DevicePosition, HeadingData, FeaturePopupData } from '@/types';

interface MapState {
  // Map instance
  map: MapLibreMap | null;
  setMap: (map: MapLibreMap | null) => void;

  // View state
  center: [number, number];
  zoom: number;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;

  // Device position
  position: DevicePosition | null;
  setPosition: (position: DevicePosition | null) => void;

  // Heading
  heading: HeadingData | null;
  setHeading: (heading: HeadingData | null) => void;

  // Follow mode
  followMode: boolean;
  setFollowMode: (follow: boolean) => void;
  toggleFollowMode: () => void;

  // Layers
  layers: Map<string, { geojson: FeatureCollection; visible: boolean; name: string }>;
  setLayers: (layers: Map<string, { geojson: FeatureCollection; visible: boolean; name: string }>) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  addLayer: (id: string, data: { geojson: FeatureCollection; visible: boolean; name: string }) => void;

  // Popup
  popup: FeaturePopupData | null;
  setPopup: (popup: FeaturePopupData | null) => void;

  // Basemap state
  hasOfflineBasemap: boolean;
  setHasOfflineBasemap: (has: boolean) => void;
  basemapBlob: Blob | null;
  setBasemapBlob: (blob: Blob | null) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  // Map instance
  map: null,
  setMap: (map) => set({ map }),

  // View state - default to a reasonable location
  center: [17.1, -22.5], // Namibia area as default
  zoom: 10,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),

  // Device position
  position: null,
  setPosition: (position) => {
    set({ position });
    // Auto-center if follow mode is enabled
    const { followMode, map } = get();
    if (followMode && position && map) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        duration: 500,
      });
    }
  },

  // Heading
  heading: null,
  setHeading: (heading) => set({ heading }),

  // Follow mode
  followMode: true,
  setFollowMode: (followMode) => set({ followMode }),
  toggleFollowMode: () => set((state) => ({ followMode: !state.followMode })),

  // Layers
  layers: new Map(),
  setLayers: (layers) => set({ layers }),
  setLayerVisibility: (id, visible) => {
    const { layers, map } = get();
    const layer = layers.get(id);
    if (layer) {
      layer.visible = visible;
      set({ layers: new Map(layers) });

      // Update map layer visibility
      if (map) {
        const layerId = `layer-${id}`;
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
        // Also handle point/line/polygon variants
        [`${layerId}-points`, `${layerId}-lines`, `${layerId}-polygons`].forEach((lid) => {
          if (map.getLayer(lid)) {
            map.setLayoutProperty(lid, 'visibility', visible ? 'visible' : 'none');
          }
        });
      }
    }
  },
  addLayer: (id, data) => {
    const { layers } = get();
    layers.set(id, data);
    set({ layers: new Map(layers) });
  },

  // Popup
  popup: null,
  setPopup: (popup) => set({ popup }),

  // Basemap state
  hasOfflineBasemap: false,
  setHasOfflineBasemap: (has) => set({ hasOfflineBasemap: has }),
  basemapBlob: null,
  setBasemapBlob: (blob) => set({ basemapBlob: blob }),
}));
