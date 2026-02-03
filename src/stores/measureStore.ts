import { create } from 'zustand';
import { polylineDistance, polylineSegmentDistances } from '@/geo';

interface MeasureState {
  // Measurement mode
  isActive: boolean;
  setActive: (active: boolean) => void;
  
  // Measurement points [lon, lat]
  points: [number, number][];
  addPoint: (lon: number, lat: number) => void;
  undoPoint: () => void;
  clearPoints: () => void;
  
  // Computed distances
  totalDistance: number;
  segmentDistances: number[];
  
  // UI state
  showMeasurePanel: boolean;
  setShowMeasurePanel: (show: boolean) => void;
}

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
  },
  undoPoint: () => {
    const { points } = get();
    if (points.length === 0) return;
    const newPoints = points.slice(0, -1);
    const totalDistance = polylineDistance(newPoints);
    const segmentDistances = polylineSegmentDistances(newPoints);
    set({ points: newPoints, totalDistance, segmentDistances });
  },
  clearPoints: () => set({ points: [], totalDistance: 0, segmentDistances: [] }),
  
  // Computed distances
  totalDistance: 0,
  segmentDistances: [],
  
  // UI state
  showMeasurePanel: false,
  setShowMeasurePanel: (show) => set({ showMeasurePanel: show }),
}));
