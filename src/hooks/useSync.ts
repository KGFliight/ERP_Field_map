import { useEffect, useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import {
  performFullSync,
  initializeAppData,
  downloadBasemap,
  getContentBaseUrl,
} from '@/services/sync';
import { getAllLayers, getStoredBasemap, updateLayerVisibility } from '@/services/db';
import type { FeatureCollection } from 'geojson';

/**
 * Check if we're actually online by trying to reach a reliable endpoint
 */
async function checkActualConnectivity(): Promise<boolean> {
  // First check navigator.onLine
  if (!navigator.onLine) {
    return false;
  }
  
  // Try to reach a reliable endpoint to verify actual connectivity
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Use a small, reliable endpoint
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch {
    return false;
  }
}

export function useSync() {
  const {
    setLayers,
    addLayer,
    setHasOfflineBasemap,
    setBasemapBlob,
    setLayerVisibility: setMapLayerVisibility,
  } = useMapStore();

  const {
    status,
    setStatus,
    setManifest,
    startSync,
    syncComplete,
    syncError,
    setOffline,
    setDownloadProgress,
    setShowDownloadPrompt,
  } = useSyncStore();

  const isInitializedRef = useRef(false);

  // Initialize app data from IndexedDB
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const { manifest, layers, hasBasemap, settings } = await initializeAppData();

      // Set manifest
      if (manifest) {
        setManifest(manifest);
      }

      // Set layers
      if (layers.length > 0) {
        const layerMap = new Map<
          string,
          { geojson: FeatureCollection; visible: boolean; name: string }
        >();
        layers.forEach((layer) => {
          layerMap.set(layer.id, {
            geojson: layer.geojson,
            visible: layer.visible,
            name: layer.name,
          });
        });
        setLayers(layerMap);
      }

      // Set basemap state
      setHasOfflineBasemap(hasBasemap);

      // Load basemap blob if available
      if (hasBasemap && settings?.lastBasemapId) {
        const basemap = await getStoredBasemap(settings.lastBasemapId);
        if (basemap) {
          setBasemapBlob(basemap.blob);
        }
      }

      // Set initial status
      if (layers.length > 0 || hasBasemap) {
        setStatus({
          state: 'stale',
          message: 'Using cached data',
        });
      }

      // Check if basemap needs to be downloaded (only if content server is configured)
      const contentUrl = getContentBaseUrl();
      if (!hasBasemap && contentUrl) {
        setShowDownloadPrompt(true);
      }
      
      // If no content server, check actual connectivity to set proper status
      if (!contentUrl) {
        const isOnline = await checkActualConnectivity();
        if (isOnline) {
          setStatus({
            state: 'synced',
            lastSync: new Date().toISOString(),
            message: 'Using online satellite tiles',
          });
        } else {
          setOffline();
        }
      }
    } catch (error) {
      console.error('Failed to initialize app data:', error);
      setOffline();
    }
  }, [
    setManifest,
    setLayers,
    setHasOfflineBasemap,
    setBasemapBlob,
    setStatus,
    setOffline,
    setShowDownloadPrompt,
  ]);

  // Perform sync
  const sync = useCallback(async () => {
    startSync();

    const result = await performFullSync((message, progress) => {
      setStatus({ message, progress });
    });

    if (result.success) {
      syncComplete(true, `Synced ${result.layersSynced} layers`);

      // Refresh layers from IndexedDB
      const layers = await getAllLayers();
      const layerMap = new Map<
        string,
        { geojson: FeatureCollection; visible: boolean; name: string }
      >();
      layers.forEach((layer) => {
        layerMap.set(layer.id, {
          geojson: layer.geojson,
          visible: layer.visible,
          name: layer.name,
        });
      });
      setLayers(layerMap);
    } else {
      if (result.error?.includes('fetch') || result.error?.includes('network')) {
        setOffline();
      } else {
        syncError(result.error || 'Sync failed');
      }
    }

    return result;
  }, [startSync, setStatus, syncComplete, syncError, setOffline, setLayers]);

  // Download basemap
  const downloadOfflineBasemap = useCallback(async () => {
    const manifest = useSyncStore.getState().manifest;
    if (!manifest?.basemap) {
      // Try to fetch manifest first
      await sync();
      const updatedManifest = useSyncStore.getState().manifest;
      if (!updatedManifest?.basemap) {
        throw new Error('No basemap configuration available');
      }
    }

    const basemapConfig = useSyncStore.getState().manifest!.basemap;

    await downloadBasemap(
      basemapConfig.url,
      basemapConfig.id,
      basemapConfig.sha256,
      (progress) => {
        setDownloadProgress(progress);
      }
    );

    // Load the downloaded basemap
    const basemap = await getStoredBasemap(basemapConfig.id);
    if (basemap) {
      setBasemapBlob(basemap.blob);
      setHasOfflineBasemap(true);
    }

    setDownloadProgress(null);
    setShowDownloadPrompt(false);
  }, [sync, setDownloadProgress, setBasemapBlob, setHasOfflineBasemap, setShowDownloadPrompt]);

  // Toggle layer visibility
  const toggleLayerVisibility = useCallback(
    async (layerId: string, visible: boolean) => {
      setMapLayerVisibility(layerId, visible);
      await updateLayerVisibility(layerId, visible);
    },
    [setMapLayerVisibility]
  );

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-sync on mount and when online
  useEffect(() => {
    const handleOnline = async () => {
      // Verify we're actually online before syncing
      const actuallyOnline = await checkActualConnectivity();
      if (actuallyOnline) {
        if (getContentBaseUrl()) {
          sync();
        } else {
          setStatus({
            state: 'synced',
            lastSync: new Date().toISOString(),
            message: 'Using online satellite tiles',
          });
        }
      }
    };

    const handleOffline = () => {
      setOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync after initialization - verify actual connectivity
    const timer = setTimeout(async () => {
      const actuallyOnline = await checkActualConnectivity();
      if (actuallyOnline && getContentBaseUrl()) {
        sync();
      } else if (!actuallyOnline) {
        setOffline();
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timer);
    };
  }, [sync, setOffline, setStatus]);

  return {
    status,
    sync,
    downloadOfflineBasemap,
    toggleLayerVisibility,
    addLayer,
  };
}
