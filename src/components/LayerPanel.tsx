import { useRef, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/hooks/useSync';
import { parseKML } from '@/services/kml';
import { saveLayer, deleteLayer as deleteLayerDB } from '@/services/db';
import type { StoredLayer } from '@/types';

export function LayerPanel() {
  const { layers, addLayer, setLayers } = useMapStore();
  const { showLayerPanel, setShowLayerPanel } = useSyncStore();
  const { toggleLayerVisibility } = useSync();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showLayerPanel) return null;

  const layerEntries = Array.from(layers.entries());

  // Handle KML file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Read the file
      const text = await file.text();
      
      // Parse the KML
      const geojson = parseKML(text);
      
      // Generate a unique ID based on filename and timestamp
      const baseName = file.name.replace(/\.(kml|kmz)$/i, '');
      const id = `user-${baseName}-${Date.now()}`;
      
      // Create the stored layer
      const storedLayer: StoredLayer = {
        id,
        version: new Date().toISOString(),
        name: baseName,
        geojson,
        storedAt: new Date().toISOString(),
        visible: true,
      };
      
      // Save to IndexedDB
      await saveLayer(storedLayer);
      
      // Add to map store
      addLayer(id, {
        geojson,
        visible: true,
        name: baseName,
      });
      
      console.log(`Uploaded KML layer: ${baseName} with ${geojson.features.length} features`);
    } catch (err) {
      console.error('Failed to upload KML:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse KML file');
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle layer deletion
  const handleDeleteLayer = async (id: string, name: string) => {
    if (!confirm(`Delete layer "${name}"? This cannot be undone.`)) return;
    
    try {
      // Delete from IndexedDB
      await deleteLayerDB(id);
      
      // Remove from map store
      const newLayers = new Map(layers);
      newLayers.delete(id);
      setLayers(newLayers);
      
      console.log(`Deleted layer: ${name}`);
    } catch (err) {
      console.error('Failed to delete layer:', err);
    }
  };

  // Check if layer is user-uploaded (starts with 'user-')
  const isUserLayer = (id: string) => id.startsWith('user-');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowLayerPanel(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-field-darker rounded-t-2xl 
                      shadow-2xl max-h-[70vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Map Layers</h2>
          <div className="flex items-center gap-2">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-field-accent text-field-darker font-medium text-sm
                         hover:bg-field-accent/90 transition-colors touch-manipulation active:scale-95
                         disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {uploading ? 'Uploading...' : 'Upload KML'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.KML"
              onChange={handleFileUpload}
              className="hidden"
            />
            {/* Close button */}
            <button
              onClick={() => setShowLayerPanel(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-field-danger/20 text-field-danger text-sm">
            {error}
          </div>
        )}

        {/* Layer list */}
        <div className="overflow-y-auto max-h-[calc(70vh-100px)]">
          {layerEntries.length === 0 ? (
            <div className="p-4 text-center text-white/50">
              <p>No layers available</p>
              <p className="text-sm mt-2">Upload a KML file to add layers</p>
            </div>
          ) : (
            <div className="p-2">
              {layerEntries.map(([id, layer]) => (
                <div
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 
                           transition-colors touch-manipulation"
                >
                  {/* Checkbox */}
                  <label className="relative cursor-pointer">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) =>
                        toggleLayerVisibility(id, e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div
                      className="w-6 h-6 rounded-md border-2 border-white/30 
                                  peer-checked:bg-field-accent peer-checked:border-field-accent
                                  transition-colors flex items-center justify-center"
                    >
                      <svg
                        className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </label>

                  {/* Layer info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {layer.name}
                    </div>
                    <div className="text-white/50 text-sm flex items-center gap-2">
                      {layer.geojson.features.length} features
                      {isUserLayer(id) && (
                        <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">Uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Delete button (only for user-uploaded layers) */}
                  {isUserLayer(id) && (
                    <button
                      onClick={() => handleDeleteLayer(id, layer.name)}
                      className="p-2 rounded-lg hover:bg-field-danger/20 text-white/40 hover:text-field-danger 
                                 transition-colors touch-manipulation"
                      title="Delete layer"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}

                  {/* Layer indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      layer.visible ? 'bg-field-accent' : 'bg-white/20'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer with info */}
        <div className="px-4 py-3 border-t border-white/10 text-xs text-white/40">
          Uploaded layers are saved on your device and persist between sessions.
        </div>
      </div>
    </>
  );
}
