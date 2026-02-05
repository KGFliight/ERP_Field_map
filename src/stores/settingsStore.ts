import { create } from 'zustand';
import { getSettings, saveSettings } from '@/services/db';
import { useMapStore } from './mapStore';

interface RingConfig {
  ring100m: boolean;
  ring300m: boolean;
  ring1000m: boolean;
}

interface SettingsState {
  // Range rings
  ringsEnabled: boolean;
  ringConfig: RingConfig;
  setRingsEnabled: (enabled: boolean) => void;
  setRingConfig: (config: Partial<RingConfig>) => void;
  toggleRing: (ring: keyof RingConfig) => void;
  
  // Follow mode
  followMode: boolean;
  setFollowMode: (enabled: boolean) => void;
  
  // Load/save
  loadSettings: () => Promise<void>;
  saveCurrentSettings: () => Promise<void>;
  
  // Settings panel
  showSettingsPanel: boolean;
  setShowSettingsPanel: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Range rings defaults
  ringsEnabled: true,
  ringConfig: {
    ring100m: true,
    ring300m: true,
    ring1000m: true,
  },
  
  // Follow mode - default to true
  followMode: true,
  
  setRingsEnabled: (enabled) => {
    set({ ringsEnabled: enabled });
    get().saveCurrentSettings();
  },
  
  setRingConfig: (config) => {
    set((state) => ({
      ringConfig: { ...state.ringConfig, ...config },
    }));
    get().saveCurrentSettings();
  },
  
  toggleRing: (ring) => {
    set((state) => ({
      ringConfig: {
        ...state.ringConfig,
        [ring]: !state.ringConfig[ring],
      },
    }));
    get().saveCurrentSettings();
  },
  
  setFollowMode: (enabled) => {
    set({ followMode: enabled });
    // Also update the map store
    useMapStore.getState().setFollowMode(enabled);
    get().saveCurrentSettings();
  },
  
  loadSettings: async () => {
    const settings = await getSettings();
    if (settings) {
      const followMode = settings.followMode ?? true;
      set({
        ringsEnabled: settings.ringsEnabled ?? true,
        ringConfig: settings.ringConfig ?? {
          ring100m: true,
          ring300m: true,
          ring1000m: true,
        },
        followMode,
      });
      // Sync follow mode with map store
      useMapStore.getState().setFollowMode(followMode);
    } else {
      // Set default follow mode to true
      useMapStore.getState().setFollowMode(true);
    }
  },
  
  saveCurrentSettings: async () => {
    const { ringsEnabled, ringConfig, followMode } = get();
    await saveSettings({ ringsEnabled, ringConfig, followMode });
  },
  
  // Settings panel
  showSettingsPanel: false,
  setShowSettingsPanel: (show) => set({ showSettingsPanel: show }),
}));
