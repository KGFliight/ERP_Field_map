import { create } from 'zustand';
import type { 
  TrainingAsset, 
  TrainingAssetType, 
  TrainingAssetCategory,
  TrainingCard, 
  TrainingPlacementMode,
  DrawingStroke,
  EnvironmentalCondition 
} from '@/types';
import { pickRandomCard } from '@/data/trainingCards';
import { useMapStore } from './mapStore';

interface TrainingState {
  // Training mode
  isTrainingMode: boolean;
  enterTrainingMode: () => void;
  exitTrainingMode: () => void;
  
  // Training assets
  trainingAssets: TrainingAsset[];
  addTrainingAsset: (lat: number, lng: number, type: TrainingAssetType, category: TrainingAssetCategory) => void;
  removeTrainingAsset: (id: string) => void;
  clearAllAssets: () => void;
  selectedAssetId: string | null;
  selectAsset: (id: string | null) => void;
  
  // Placement mode
  placementMode: TrainingPlacementMode;
  setPlacementMode: (mode: TrainingPlacementMode) => void;
  selectedAssetType: TrainingAssetType | null;
  setSelectedAssetType: (type: TrainingAssetType | null) => void;
  
  // Scenario cards
  activeCards: TrainingCard[];
  activeEnvironmentalCondition: EnvironmentalCondition | null;
  randomizeScenario: () => void;
  clearScenario: () => void;
  
  // Drawing
  isDrawingMode: boolean;
  setDrawingMode: (enabled: boolean) => void;
  isDeleteMode: boolean;
  setDeleteMode: (enabled: boolean) => void;
  drawingStrokes: DrawingStroke[];
  selectedStrokeId: string | null;
  currentDrawingColor: string;
  setDrawingColor: (color: string) => void;
  addDrawingStroke: (stroke: DrawingStroke) => void;
  undoLastStroke: () => void;
  deleteStroke: (id: string) => void;
  selectStroke: (id: string | null) => void;
  clearAllDrawings: () => void;
  
  // UI
  showTrainingPanel: boolean;
  setShowTrainingPanel: (show: boolean) => void;
  showScenarioModal: boolean;
  setShowScenarioModal: (show: boolean) => void;
}

function getAssetName(type: TrainingAssetType): string {
  const names: Record<TrainingAssetType, string> = {
    poacher: 'Poacher',
    poacher_armed: 'Armed Poacher',
    poacher_vehicle: 'Poacher Vehicle',
    snare: 'Snare',
    injured_animal: 'Injured Animal',
    ranger: 'Ranger',
    ranger_team: 'Ranger Team',
    vehicle: 'Patrol Vehicle',
    helicopter: 'Helicopter',
    base_camp: 'Base Camp',
    checkpoint: 'Checkpoint',
  };
  return names[type];
}

function randomInRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  // Training mode
  isTrainingMode: false,
  enterTrainingMode: () => set({ isTrainingMode: true, showTrainingPanel: true }),
  exitTrainingMode: () => {
    set({ 
      isTrainingMode: false, 
      showTrainingPanel: false,
      placementMode: 'none',
      selectedAssetType: null,
      isDrawingMode: false,
      isDeleteMode: false,
    });
  },
  
  // Training assets
  trainingAssets: [],
  selectedAssetId: null,
  
  addTrainingAsset: (lat, lng, type, category) => {
    const asset: TrainingAsset = {
      id: `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      type,
      name: getAssetName(type),
      notes: '',
      latitude: lat,
      longitude: lng,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      trainingAssets: [...state.trainingAssets, asset],
    }));
  },
  
  removeTrainingAsset: (id) => {
    set((state) => ({
      trainingAssets: state.trainingAssets.filter((a) => a.id !== id),
      selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
    }));
  },
  
  clearAllAssets: () => set({ trainingAssets: [], selectedAssetId: null }),
  
  selectAsset: (id) => set({ selectedAssetId: id }),
  
  // Placement mode
  placementMode: 'none',
  setPlacementMode: (mode) => set({ 
    placementMode: mode, 
    isDrawingMode: false,
    isDeleteMode: false,
  }),
  
  selectedAssetType: null,
  setSelectedAssetType: (type) => set({ selectedAssetType: type }),
  
  // Scenario cards
  activeCards: [],
  activeEnvironmentalCondition: null,
  
  randomizeScenario: () => {
    const map = useMapStore.getState().map;
    if (!map) return;
    
    const bounds = map.getBounds();
    const { clearAllAssets, addTrainingAsset } = get();
    
    // Clear existing
    clearAllAssets();
    
    // Draw one card from each category
    const targetCard = pickRandomCard('targets');
    const friendlyCard = pickRandomCard('friendlies');
    const envCard = pickRandomCard('environmental');
    
    // Place targets
    if (targetCard.assetTypes && targetCard.minCount && targetCard.maxCount) {
      const count = randomInRange(targetCard.minCount, targetCard.maxCount);
      for (let i = 0; i < count; i++) {
        const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
        const assetType = targetCard.assetTypes[Math.floor(Math.random() * targetCard.assetTypes.length)];
        addTrainingAsset(lat, lng, assetType, 'target');
      }
    }
    
    // Place friendlies
    if (friendlyCard.assetTypes && friendlyCard.minCount && friendlyCard.maxCount) {
      const count = randomInRange(friendlyCard.minCount, friendlyCard.maxCount);
      for (let i = 0; i < count; i++) {
        const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth());
        const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest());
        const assetType = friendlyCard.assetTypes[Math.floor(Math.random() * friendlyCard.assetTypes.length)];
        addTrainingAsset(lat, lng, assetType, 'friendly');
      }
    }
    
    set({
      activeCards: [targetCard, friendlyCard, envCard],
      activeEnvironmentalCondition: envCard.condition || null,
      showScenarioModal: true,
    });
  },
  
  clearScenario: () => {
    get().clearAllAssets();
    set({ activeCards: [], activeEnvironmentalCondition: null });
  },
  
  // Drawing
  isDrawingMode: false,
  setDrawingMode: (enabled) => set((state) => ({ 
    isDrawingMode: enabled, 
    isDeleteMode: false,
    // Only reset placementMode when ENABLING drawing mode
    placementMode: enabled ? 'none' : state.placementMode,
    selectedAssetType: enabled ? null : state.selectedAssetType,
    selectedStrokeId: null,
  })),
  
  isDeleteMode: false,
  setDeleteMode: (enabled) => set((state) => ({ 
    isDeleteMode: enabled, 
    isDrawingMode: false,
    // Only reset placementMode when ENABLING delete mode
    placementMode: enabled ? 'none' : state.placementMode,
    selectedAssetType: enabled ? null : state.selectedAssetType,
    selectedStrokeId: null,
  })),
  
  drawingStrokes: [],
  selectedStrokeId: null,
  currentDrawingColor: '#3b82f6',
  
  setDrawingColor: (color) => set({ currentDrawingColor: color }),
  
  addDrawingStroke: (stroke) => {
    set((state) => ({
      drawingStrokes: [...state.drawingStrokes, stroke],
    }));
  },
  
  undoLastStroke: () => {
    set((state) => ({
      drawingStrokes: state.drawingStrokes.slice(0, -1),
    }));
  },
  
  deleteStroke: (id) => {
    set((state) => ({
      drawingStrokes: state.drawingStrokes.filter((s) => s.id !== id),
      selectedStrokeId: state.selectedStrokeId === id ? null : state.selectedStrokeId,
    }));
  },
  
  selectStroke: (id) => set({ selectedStrokeId: id }),
  
  clearAllDrawings: () => set({ drawingStrokes: [], selectedStrokeId: null }),
  
  // UI
  showTrainingPanel: false,
  setShowTrainingPanel: (show) => set({ showTrainingPanel: show }),
  showScenarioModal: false,
  setShowScenarioModal: (show) => set({ showScenarioModal: show }),
}));
