import { create } from 'zustand';
import type { StoredMarker, MarkerIconType, AppMode } from '@/types';
import { getAllMarkers, saveMarker, deleteMarker as deleteMarkerDB } from '@/services/db';

interface MarkerState {
  // Markers data
  markers: StoredMarker[];
  selectedMarkerId: string | null;
  
  // App mode
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
  // Marker operations
  loadMarkers: () => Promise<void>;
  addMarker: (lat: number, lon: number) => Promise<StoredMarker>;
  updateMarker: (id: string, updates: Partial<Omit<StoredMarker, 'id' | 'createdAt'>>) => Promise<void>;
  deleteMarker: (id: string) => Promise<void>;
  selectMarker: (id: string | null) => void;
  
  // UI state
  showMarkerPanel: boolean;
  setShowMarkerPanel: (show: boolean) => void;
  showMarkerEditor: boolean;
  setShowMarkerEditor: (show: boolean) => void;
  editingMarker: StoredMarker | null;
  setEditingMarker: (marker: StoredMarker | null) => void;
}

export const useMarkerStore = create<MarkerState>((set, get) => ({
  // Markers data
  markers: [],
  selectedMarkerId: null,
  
  // App mode
  mode: 'view',
  setMode: (mode) => set({ mode }),
  
  // Marker operations
  loadMarkers: async () => {
    const markers = await getAllMarkers();
    set({ markers });
  },
  
  addMarker: async (lat: number, lon: number) => {
    const now = new Date().toISOString();
    const marker: StoredMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'New Pin',
      notes: '',
      icon: 'pin' as MarkerIconType,
      color: '#22d3ee',
      latitude: lat,
      longitude: lon,
      createdAt: now,
      updatedAt: now,
    };
    
    await saveMarker(marker);
    set((state) => ({
      markers: [...state.markers, marker],
      selectedMarkerId: marker.id,
      mode: 'view', // Exit drop pin mode after adding
    }));
    
    return marker;
  },
  
  updateMarker: async (id: string, updates: Partial<Omit<StoredMarker, 'id' | 'createdAt'>>) => {
    const { markers } = get();
    const existing = markers.find((m) => m.id === id);
    if (!existing) return;
    
    const updated: StoredMarker = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await saveMarker(updated);
    set((state) => ({
      markers: state.markers.map((m) => (m.id === id ? updated : m)),
    }));
  },
  
  deleteMarker: async (id: string) => {
    await deleteMarkerDB(id);
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
      selectedMarkerId: state.selectedMarkerId === id ? null : state.selectedMarkerId,
      editingMarker: state.editingMarker?.id === id ? null : state.editingMarker,
    }));
  },
  
  selectMarker: (id: string | null) => {
    set({ selectedMarkerId: id });
  },
  
  // UI state
  showMarkerPanel: false,
  setShowMarkerPanel: (show) => set({ showMarkerPanel: show }),
  showMarkerEditor: false,
  setShowMarkerEditor: (show) => set({ showMarkerEditor: show }),
  editingMarker: null,
  setEditingMarker: (marker) => set({ editingMarker: marker, showMarkerEditor: !!marker }),
}));
