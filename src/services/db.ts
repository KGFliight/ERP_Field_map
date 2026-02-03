import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  StoredManifest,
  StoredBasemap,
  StoredLayer,
  StoredSettings,
  StoredMarker,
  StoredMeasurement,
} from '@/types';

const DB_NAME = 'erp-field-map';
const DB_VERSION = 2;

interface FieldMapDB extends DBSchema {
  manifest: {
    key: string;
    value: StoredManifest;
  };
  basemap: {
    key: string;
    value: StoredBasemap;
  };
  layers: {
    key: string;
    value: StoredLayer;
    indexes: { 'by-version': string };
  };
  settings: {
    key: string;
    value: StoredSettings;
  };
  markers: {
    key: string;
    value: StoredMarker;
    indexes: { 'by-created': string };
  };
  measurements: {
    key: string;
    value: StoredMeasurement;
  };
}

let dbInstance: IDBPDatabase<FieldMapDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<FieldMapDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FieldMapDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Manifest store
      if (!db.objectStoreNames.contains('manifest')) {
        db.createObjectStore('manifest', { keyPath: 'id' });
      }

      // Basemap store
      if (!db.objectStoreNames.contains('basemap')) {
        db.createObjectStore('basemap', { keyPath: 'id' });
      }

      // Layers store
      if (!db.objectStoreNames.contains('layers')) {
        const layersStore = db.createObjectStore('layers', { keyPath: 'id' });
        layersStore.createIndex('by-version', 'version');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // Markers store
      if (!db.objectStoreNames.contains('markers')) {
        const markersStore = db.createObjectStore('markers', { keyPath: 'id' });
        markersStore.createIndex('by-created', 'createdAt');
      }

      // Measurements store
      if (!db.objectStoreNames.contains('measurements')) {
        db.createObjectStore('measurements', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// Manifest operations
export async function getStoredManifest(): Promise<StoredManifest | undefined> {
  const db = await getDB();
  return db.get('manifest', 'current');
}

export async function saveManifest(manifest: StoredManifest): Promise<void> {
  const db = await getDB();
  await db.put('manifest', manifest);
}

// Basemap operations
export async function getStoredBasemap(
  id: string
): Promise<StoredBasemap | undefined> {
  const db = await getDB();
  return db.get('basemap', id);
}

export async function saveBasemap(basemap: StoredBasemap): Promise<void> {
  const db = await getDB();
  await db.put('basemap', basemap);
}

export async function deleteBasemap(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('basemap', id);
}

export async function hasBasemap(id: string): Promise<boolean> {
  const db = await getDB();
  const basemap = await db.get('basemap', id);
  return !!basemap;
}

// Layer operations
export async function getStoredLayer(
  id: string
): Promise<StoredLayer | undefined> {
  const db = await getDB();
  return db.get('layers', id);
}

export async function getAllLayers(): Promise<StoredLayer[]> {
  const db = await getDB();
  return db.getAll('layers');
}

export async function saveLayer(layer: StoredLayer): Promise<void> {
  const db = await getDB();
  await db.put('layers', layer);
}

export async function deleteLayer(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('layers', id);
}

export async function updateLayerVisibility(
  id: string,
  visible: boolean
): Promise<void> {
  const db = await getDB();
  const layer = await db.get('layers', id);
  if (layer) {
    layer.visible = visible;
    await db.put('layers', layer);
  }
}

// Settings operations
export async function getSettings(): Promise<StoredSettings | undefined> {
  const db = await getDB();
  return db.get('settings', 'user');
}

export async function saveSettings(
  settings: Partial<StoredSettings>
): Promise<void> {
  const db = await getDB();
  const existing = (await db.get('settings', 'user')) || {
    id: 'user' as const,
    followMode: true,
    headingSource: 'auto' as const,
    basemapDownloaded: false,
    ringsEnabled: true,
    ringConfig: {
      ring100m: true,
      ring300m: true,
      ring1000m: true,
    },
  };
  await db.put('settings', { ...existing, ...settings });
}

// Marker operations
export async function getMarker(id: string): Promise<StoredMarker | undefined> {
  const db = await getDB();
  return db.get('markers', id);
}

export async function getAllMarkers(): Promise<StoredMarker[]> {
  const db = await getDB();
  return db.getAll('markers');
}

export async function saveMarker(marker: StoredMarker): Promise<void> {
  const db = await getDB();
  await db.put('markers', marker);
}

export async function deleteMarker(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('markers', id);
}

// Measurement operations
export async function getMeasurement(id: string): Promise<StoredMeasurement | undefined> {
  const db = await getDB();
  return db.get('measurements', id);
}

export async function getAllMeasurements(): Promise<StoredMeasurement[]> {
  const db = await getDB();
  return db.getAll('measurements');
}

export async function saveMeasurement(measurement: StoredMeasurement): Promise<void> {
  const db = await getDB();
  await db.put('measurements', measurement);
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('measurements', id);
}

export async function clearMeasurements(): Promise<void> {
  const db = await getDB();
  await db.clear('measurements');
}

// Utility: Get total storage used
export async function getStorageStats(): Promise<{
  basemapSize: number;
  layersCount: number;
  markersCount: number;
  totalSize: number;
}> {
  const db = await getDB();
  const basemaps = await db.getAll('basemap');
  const layers = await db.getAll('layers');
  const markers = await db.getAll('markers');

  const basemapSize = basemaps.reduce((acc, b) => acc + b.sizeBytes, 0);
  const layersSize = layers.reduce(
    (acc, l) => acc + JSON.stringify(l.geojson).length,
    0
  );

  return {
    basemapSize,
    layersCount: layers.length,
    markersCount: markers.length,
    totalSize: basemapSize + layersSize,
  };
}
