import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import { useSync } from '@/hooks/useSync';

export function LayerPanel() {
  const { layers } = useMapStore();
  const { showLayerPanel, setShowLayerPanel } = useSyncStore();
  const { toggleLayerVisibility } = useSync();

  if (!showLayerPanel) return null;

  const layerEntries = Array.from(layers.entries());

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowLayerPanel(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-field-darker rounded-t-2xl 
                      shadow-2xl max-h-[60vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Map Layers</h2>
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

        {/* Layer list */}
        <div className="overflow-y-auto max-h-[calc(60vh-80px)]">
          {layerEntries.length === 0 ? (
            <div className="p-4 text-center text-white/50">
              No layers available
            </div>
          ) : (
            <div className="p-2">
              {layerEntries.map(([id, layer]) => (
                <label
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 
                           cursor-pointer transition-colors touch-manipulation"
                >
                  {/* Checkbox */}
                  <div className="relative">
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
                  </div>

                  {/* Layer info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {layer.name}
                    </div>
                    <div className="text-white/50 text-sm">
                      {layer.geojson.features.length} features
                    </div>
                  </div>

                  {/* Layer indicator */}
                  <div
                    className={`w-3 h-3 rounded-full ${
                      layer.visible ? 'bg-field-accent' : 'bg-white/20'
                    }`}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
