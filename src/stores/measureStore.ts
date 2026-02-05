import { create } from 'zustand';
import { polylineDistance, polylineSegmentDistances } from '@/geo';
import { saveMeasurement, getMeasurement } from '@/services/db';

interface MeasureState {
  // Measurement mode
  isActive: boolean;
  setActive: (active: boolean) => void;
  
  // Measurement points [lon, lat]
  points: [number, number][];
  addPoint: (lon: number, lat: number) => void;
  undoPoint: () => void;
  clearPoints: () => void;
  loadMeasurement: () => Promise<void>;
  
  // Computed distances
  totalDistance: number;
  segmentDistances: number[];
  
  // UI state
  showMeasurePanel: boolean;
  setShowMeasurePanel: (show: boolean) => void;
}

// Save measurement to IndexedDB
const persistMeasurement = async (points: [number, number][], totalDistance: number) => {
  if (points.length > 0) {
    await saveMeasurement({
      id: 'current',
      geojson: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points,
          },
        }],
      },
      totalDistanceM: totalDistance,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const useMeasureStore = create<MeasureState>((set, get) => ({
  // Measurement mode
  isActive: false,
  setActive: (isActive) => set({ isActive }),
  
  // Measurement points
  points: [],
  addPoint: (lon: number, lat: number) => {
    const { points } = get();
    const newPoints = [...points, [lon, lat] as [number, number]];
    const totalDistance = polylineDistance(newPoints);
    const segmentDistances = polylineSegmentDistances(newPoints);
    set({ points: newPoints, totalDistance, segmentDistances });
    // Persist to IndexedDB
    persistMeasurement(newPoints, totalDistance);
  },
  undoPoint: () => {
    const { points } = get();
    if (points.length === 0) return;
    const newPoints = points.slice(0, -1);
    const totalDistance = polylineDistance(newPoints);
    const segmentDistances = polylineSegmentDistances(newPoints);
    set({ points: newPoints, totalDistance, segmentDistances });
    // Persist to IndexedDB
    persistMeasurement(newPoints, totalDistance);
  },
  clearPoints: () => {
    set({ points: [], totalDistance: 0, segmentDistances: [] });
    // Clear from IndexedDB
    saveMeasurement({
      id: 'current',
      geojson: { type: 'FeatureCollection', features: [] },
      totalDistanceM: 0,
      updatedAt: new Date().toISOString(),
    });
  },
  loadMeasurement: async () => {
    try {
      const measurement = await getMeasurement('current');
      if (measurement && measurement.geojson.features.length > 0) {
        const feature = measurement.geojson.features[0];
        if (feature.geometry.type === 'LineString') {
          const points = feature.geometry.coordinates as [number, number][];
          const totalDistance = polylineDistance(points);
          const segmentDistances = polylineSegmentDistances(points);
          set({ points, totalDistance, segmentDistances });
        }
      }
    } catch (error) {
      console.error('Failed to load measurement:', error);
    }
  },
  
  // Computed distances
  totalDistance: 0,
  segmentDistances: [],
  
  // UI state
  showMeasurePanel: false,
  setShowMeasurePanel: (show) => set({ showMeasurePanel: show }),
}));
