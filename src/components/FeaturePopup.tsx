import { useMapStore } from '@/stores/mapStore';

export function FeaturePopup() {
  const { popup, setPopup } = useMapStore();

  if (!popup) return null;

  return (
    <div className="absolute bottom-24 left-4 right-4 z-20 max-w-md mx-auto">
      <div className="bg-field-darker/95 backdrop-blur-sm rounded-xl shadow-2xl 
                      border border-white/10 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold text-lg pr-2">{popup.name}</h3>
          <button
            onClick={() => setPopup(null)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
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

        {/* Content */}
        {popup.description && (
          <div className="p-4">
            <p className="text-white/80 text-sm leading-relaxed">
              {popup.description}
            </p>
          </div>
        )}

        {/* Coordinates */}
        <div className="px-4 pb-4">
          <div className="text-white/50 text-xs font-mono">
            {popup.coordinates[1].toFixed(6)}, {popup.coordinates[0].toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}
