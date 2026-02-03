import { create } from 'zustand';
import type { SyncStatus, ContentManifest, DownloadProgress } from '@/types';

interface SyncState {
  // Sync status
  status: SyncStatus;
  setStatus: (status: Partial<SyncStatus>) => void;

  // Manifest
  manifest: ContentManifest | null;
  setManifest: (manifest: ContentManifest | null) => void;

  // Download progress
  downloadProgress: DownloadProgress | null;
  setDownloadProgress: (progress: DownloadProgress | null) => void;

  // Actions
  startSync: () => void;
  syncComplete: (success: boolean, message?: string) => void;
  syncError: (message: string) => void;
  setOffline: () => void;

  // UI state
  showDownloadPrompt: boolean;
  setShowDownloadPrompt: (show: boolean) => void;
  showLayerPanel: boolean;
  setShowLayerPanel: (show: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  // Sync status
  status: {
    state: 'offline',
    lastSync: null,
  },
  setStatus: (statusUpdate) =>
    set((state) => ({
      status: { ...state.status, ...statusUpdate },
    })),

  // Manifest
  manifest: null,
  setManifest: (manifest) => set({ manifest }),

  // Download progress
  downloadProgress: null,
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),

  // Actions
  startSync: () =>
    set({
      status: {
        state: 'syncing',
        lastSync: null,
        message: 'Syncing...',
      },
    }),

  syncComplete: (success, message) =>
    set({
      status: {
        state: success ? 'synced' : 'stale',
        lastSync: success ? new Date().toISOString() : null,
        message,
      },
    }),

  syncError: (message) =>
    set({
      status: {
        state: 'error',
        lastSync: null,
        message,
      },
    }),

  setOffline: () =>
    set((state) => ({
      status: {
        ...state.status,
        state: 'offline',
        message: 'Working offline',
      },
    })),

  // UI state
  showDownloadPrompt: false,
  setShowDownloadPrompt: (showDownloadPrompt) => set({ showDownloadPrompt }),
  showLayerPanel: false,
  setShowLayerPanel: (showLayerPanel) => set({ showLayerPanel }),
}));
