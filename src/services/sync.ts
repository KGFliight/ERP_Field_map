import type {
  ContentManifest,
  LayerConfig,
  StoredLayer,
  DownloadProgress,
} from '@/types';
import {
  getStoredManifest,
  saveManifest,
  getAllLayers,
  saveLayer,
  getStoredBasemap,
  saveBasemap,
  saveSettings,
  getSettings,
} from './db';
import { fetchAndParseKML } from './kml';

const FETCH_TIMEOUT = 5000; // 5 seconds

/**
 * Get content base URL from environment
 */
export function getContentBaseUrl(): string {
  return import.meta.env.VITE_CONTENT_BASE_URL || '';
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the content manifest from server
 */
export async function fetchManifest(): Promise<ContentManifest | null> {
  const baseUrl = getContentBaseUrl();
  if (!baseUrl) {
    console.warn('CONTENT_BASE_URL not configured');
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/manifest.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch manifest:', error);
    return null;
  }
}

/**
 * Check if sync is needed based on manifest version
 */
export async function checkSyncNeeded(
  newManifest: ContentManifest
): Promise<{
  needsSync: boolean;
  changedLayers: LayerConfig[];
  basemapChanged: boolean;
}> {
  const stored = await getStoredManifest();
  const storedLayers = await getAllLayers();

  // If no stored manifest, everything is new
  if (!stored) {
    return {
      needsSync: true,
      changedLayers: newManifest.layers,
      basemapChanged: true,
    };
  }

  // Check if version changed
  const versionChanged = stored.version !== newManifest.version;

  // Check each layer for changes
  const storedLayerMap = new Map(storedLayers.map((l) => [l.id, l]));
  const changedLayers = newManifest.layers.filter((layer) => {
    const storedLayer = storedLayerMap.get(layer.id);
    if (!storedLayer) return true;
    if (layer.sha256 && storedLayer.sha256 !== layer.sha256) return true;
    return false;
  });

  // Check basemap
  const storedBasemap = await getStoredBasemap(newManifest.basemap.id);
  const basemapChanged =
    !storedBasemap ||
    (newManifest.basemap.sha256 &&
      storedBasemap.sha256 !== newManifest.basemap.sha256);

  return {
    needsSync: versionChanged || changedLayers.length > 0,
    changedLayers,
    basemapChanged: !!basemapChanged,
  };
}

/**
 * Sync a single layer (fetch, parse, store)
 */
export async function syncLayer(layer: LayerConfig): Promise<StoredLayer> {
  const baseUrl = getContentBaseUrl();
  const url = layer.url.startsWith('http') ? layer.url : `${baseUrl}${layer.url}`;

  // Fetch and parse KML
  const geojson = await fetchAndParseKML(url);

  // Create stored layer object
  const storedLayer: StoredLayer = {
    id: layer.id,
    version: new Date().toISOString(),
    name: layer.name,
    geojson,
    sha256: layer.sha256,
    storedAt: new Date().toISOString(),
    visible: layer.defaultVisible,
  };

  // Save to IndexedDB
  await saveLayer(storedLayer);

  return storedLayer;
}

/**
 * Sync all changed layers
 */
export async function syncLayers(
  layers: LayerConfig[],
  onProgress?: (completed: number, total: number) => void
): Promise<StoredLayer[]> {
  const results: StoredLayer[] = [];

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    try {
      const synced = await syncLayer(layer);
      results.push(synced);
    } catch (error) {
      console.error(`Failed to sync layer ${layer.id}:`, error);
    }
    onProgress?.(i + 1, layers.length);
  }

  return results;
}

/**
 * Download basemap PMTiles file with progress
 */
export async function downloadBasemap(
  url: string,
  id: string,
  sha256?: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const baseUrl = getContentBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  onProgress?.({
    phase: 'fetching',
    loaded: 0,
    total: 0,
    percentage: 0,
  });

  const response = await fetch(fullUrl);
  if (!response.ok) {
    throw new Error(`Failed to download basemap: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Read the response as a stream with progress
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    onProgress?.({
      phase: 'fetching',
      loaded,
      total,
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
    });
  }

  // Combine chunks into a single blob
  const blob = new Blob(chunks, { type: 'application/octet-stream' });

  onProgress?.({
    phase: 'storing',
    loaded,
    total: loaded,
    percentage: 100,
  });

  // Store in IndexedDB
  await saveBasemap({
    id,
    version: new Date().toISOString(),
    blob,
    sha256,
    sizeBytes: blob.size,
    storedAt: new Date().toISOString(),
  });

  // Update settings to mark basemap as downloaded
  await saveSettings({ basemapDownloaded: true, lastBasemapId: id });

  onProgress?.({
    phase: 'complete',
    loaded,
    total: loaded,
    percentage: 100,
  });
}

/**
 * Full sync operation
 */
export async function performFullSync(
  onProgress?: (message: string, progress?: number) => void
): Promise<{
  success: boolean;
  layersSynced: number;
  error?: string;
}> {
  try {
    // Check if content server is configured
    const baseUrl = getContentBaseUrl();
    if (!baseUrl) {
      onProgress?.('No content server configured', 100);
      return { success: true, layersSynced: 0 };
    }

    onProgress?.('Fetching manifest...', 0);

    // Fetch manifest
    const manifest = await fetchManifest();
    if (!manifest) {
      // Check if we have stored content
      const stored = await getStoredManifest();
      if (stored) {
        return { success: true, layersSynced: 0 };
      }
      return { success: false, layersSynced: 0, error: 'Content server unavailable' };
    }

    // Check what needs syncing
    const { needsSync, changedLayers } = await checkSyncNeeded(manifest);

    if (!needsSync) {
      onProgress?.('Already up to date', 100);
      return { success: true, layersSynced: 0 };
    }

    // Sync layers
    onProgress?.(`Syncing ${changedLayers.length} layers...`, 20);
    await syncLayers(changedLayers, (completed, total) => {
      const progress = 20 + (completed / total) * 70;
      onProgress?.(`Syncing layer ${completed}/${total}`, progress);
    });

    // Save manifest
    await saveManifest({
      id: 'current',
      version: manifest.version,
      fetchedAt: new Date().toISOString(),
      rawJson: manifest,
    });

    onProgress?.('Sync complete', 100);
    return { success: true, layersSynced: changedLayers.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, layersSynced: 0, error: message };
  }
}

/**
 * Initialize app data (load from IndexedDB)
 */
export async function initializeAppData(): Promise<{
  manifest: ContentManifest | null;
  layers: StoredLayer[];
  hasBasemap: boolean;
  settings: Awaited<ReturnType<typeof getSettings>>;
}> {
  const [storedManifest, layers, settings] = await Promise.all([
    getStoredManifest(),
    getAllLayers(),
    getSettings(),
  ]);

  const hasBasemap = settings?.basemapDownloaded ?? false;

  return {
    manifest: storedManifest?.rawJson ?? null,
    layers,
    hasBasemap,
    settings,
  };
}
