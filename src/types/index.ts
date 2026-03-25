import type { FeatureCollection, Feature, LineString } from 'geojson';

// Content manifest types
export interface ContentManifest {
  version: string;
  basemap: BasemapConfig;
  layers: LayerConfig[];
}

export interface BasemapConfig {
  id: string;
  type: 'pmtiles';
  url: string;
  sha256?: string;
}

export interface LayerConfig {
  id: string;
  type: 'kml' | 'geojson';
  name: string;
  url: string;
  sha256?: string;
  defaultVisible: boolean;
}

// IndexedDB stored types
export interface StoredManifest {
  id: 'current';
  version: string;
  fetchedAt: string;
  rawJson: ContentManifest;
}

export interface StoredBasemap {
  id: string;
  version: string;
  blob: Blob;
  sha256?: string;
  sizeBytes: number;
  storedAt: string;
}

export interface StoredLayer {
  id: string;
  version: string;
  name: string;
  geojson: FeatureCollection;
  sha256?: string;
  storedAt: string;
  visible: boolean;
}

// Marker types
export type MarkerIconType = 'pin' | 'flag' | 'star' | 'warning' | 'info' | 'camp' | 'water' | 'vehicle';

export interface StoredMarker {
  id: string;
  name: string;
  notes: string;
  icon: MarkerIconType;
  color: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

// Measurement types
export interface StoredMeasurement {
  id: string;
  geojson: Feature<LineString>;
  totalDistanceM: number;
  updatedAt: string;
}

export interface StoredSettings {
  id: 'user';
  followMode: boolean;
  lastBasemapId?: string;
  headingSource: 'device' | 'gps' | 'auto';
  basemapDownloaded: boolean;
  ringsEnabled: boolean;
  ringConfig: {
    ring100m: boolean;
    ring300m: boolean;
    ring1000m: boolean;
  };
}

// Geolocation types
export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface HeadingData {
  heading: number;
  source: 'device' | 'gps';
  accuracy?: number;
}

// Sync status types
export type SyncState = 'synced' | 'syncing' | 'stale' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSync: string | null;
  message?: string;
  progress?: number;
}

// Download progress
export interface DownloadProgress {
  phase: 'fetching' | 'storing' | 'complete' | 'error';
  loaded: number;
  total: number;
  percentage: number;
}

// Map feature popup
export interface FeaturePopupData {
  name: string;
  description: string;
  coordinates: [number, number];
  properties: Record<string, unknown>;
}

// App interaction modes
export type AppMode = 'view' | 'dropPin' | 'measure';

// Measurement state
export interface MeasurementState {
  isActive: boolean;
  points: [number, number][];
  totalDistance: number;
}

// Training Mode types
export type TrainingAssetCategory = 'target' | 'friendly';

export type TrainingTargetType = 
  | 'poacher' 
  | 'poacher_armed' 
  | 'poacher_vehicle' 
  | 'snare' 
  | 'injured_animal';

export type TrainingFriendlyType = 
  | 'ranger' 
  | 'ranger_team' 
  | 'vehicle' 
  | 'helicopter' 
  | 'base_camp' 
  | 'checkpoint';

export type TrainingAssetType = TrainingTargetType | TrainingFriendlyType;

export type EnvironmentalCondition = 
  | 'night_patrol' 
  | 'animal_down' 
  | 'person_injured' 
  | 'radio_blackout' 
  | 'storm_incoming' 
  | 'low_visibility';

export interface TrainingAsset {
  id: string;
  category: TrainingAssetCategory;
  type: TrainingAssetType;
  name: string;
  notes: string;
  latitude: number;
  longitude: number;
  heading?: number;
  createdAt: string;
}

export interface TrainingCard {
  id: string;
  category: 'targets' | 'friendlies' | 'environmental';
  name: string;
  description: string;
  minCount?: number;
  maxCount?: number;
  assetTypes?: TrainingAssetType[];
  condition?: EnvironmentalCondition;
}

export interface DrawingStroke {
  id: string;
  points: [number, number][];
  color: string;
  width: number;
}

export type TrainingPlacementMode = 'none' | 'target' | 'friendly';
