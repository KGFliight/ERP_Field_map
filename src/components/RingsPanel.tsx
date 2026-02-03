import { useSettingsStore } from '@/stores/settingsStore';

export function RingsPanel() {
  const {
    ringsEnabled,
    ringConfig,
    setRingsEnabled,
    toggleRing,
    showSettingsPanel,
    setShowSettingsPanel,
  } = useSettingsStore();

  if (!showSettingsPanel) return null;

  const rings = [
    { key: 'ring100m' as const, label: '100 m', distance: 100 },
    { key: 'ring300m' as const, label: '300 m', distance: 300 },
    { key: 'ring1000m' as const, label: '1 km', distance: 1000 },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowSettingsPanel(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-field-darker rounded-t-2xl 
                      shadow-2xl overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Range Rings</h2>
          <button
            onClick={() => setShowSettingsPanel(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Master toggle */}
          <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-field-accent/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-field-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="3" strokeWidth={2} />
                  <circle cx="12" cy="12" r="7" strokeWidth={2} strokeDasharray="4 2" />
                  <circle cx="12" cy="12" r="10" strokeWidth={2} strokeDasharray="4 2" />
                </svg>
              </div>
              <div>
                <div className="text-white font-medium">Show Range Rings</div>
                <div className="text-white/50 text-sm">Display distance rings around your position</div>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={ringsEnabled}
                onChange={(e) => setRingsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 rounded-full peer peer-checked:bg-field-accent transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>

          {/* Individual ring toggles */}
          {ringsEnabled && (
            <div className="space-y-2">
              <div className="text-white/60 text-sm px-1">Ring Distances</div>
              {rings.map((ring) => (
                <label
                  key={ring.key}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center
                        ${ringConfig[ring.key] ? 'border-field-accent' : 'border-white/30'}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full
                          ${ringConfig[ring.key] ? 'bg-field-accent' : 'bg-transparent'}`}
                      />
                    </div>
                    <span className="text-white font-medium">{ring.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ringConfig[ring.key]}
                    onChange={() => toggleRing(ring.key)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="text-white/40 text-xs text-center pt-2">
            Range rings show distances from your current position
          </div>
        </div>
      </div>
    </>
  );
}
