import { useMeasureStore } from '@/stores/measureStore';
import { formatDistance } from '@/geo';

export function MeasurePanel() {
  const {
    isActive,
    setActive,
    points,
    totalDistance,
    segmentDistances,
    undoPoint,
    clearPoints,
    showMeasurePanel,
    setShowMeasurePanel,
  } = useMeasureStore();

  if (!showMeasurePanel) return null;

  const handleClose = () => {
    setShowMeasurePanel(false);
    setActive(false);
    clearPoints();
  };

  const handleStartMeasure = () => {
    setActive(true);
    clearPoints();
  };

  const handleStopMeasure = () => {
    setActive(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowMeasurePanel(false)}
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
          <h2 className="text-white font-semibold text-lg">Measure Distance</h2>
          <button
            onClick={handleClose}
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
          {/* Status */}
          {isActive ? (
            <div className="bg-field-accent/20 rounded-lg p-3 border border-field-accent/30">
              <div className="flex items-center gap-2 text-field-accent">
                <div className="w-2 h-2 rounded-full bg-field-accent animate-pulse" />
                <span className="font-medium">Measuring active</span>
              </div>
              <p className="text-white/60 text-sm mt-1">
                Tap on the map to add points
              </p>
            </div>
          ) : points.length > 0 ? (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-sm">
                Measurement complete. {points.length} points recorded.
              </p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/60 text-sm">
                Tap "Start Measuring" then tap points on the map
              </p>
            </div>
          )}

          {/* Total distance */}
          {points.length >= 2 && (
            <div className="bg-field-darker border border-white/10 rounded-lg p-4">
              <div className="text-white/60 text-sm mb-1">Total Distance</div>
              <div className="text-4xl font-bold text-white">
                {formatDistance(totalDistance)}
              </div>
            </div>
          )}

          {/* Segment distances */}
          {segmentDistances.length > 0 && (
            <div className="space-y-2">
              <div className="text-white/60 text-sm">Segments</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {segmentDistances.map((dist, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-1 px-2 bg-white/5 rounded"
                  >
                    <span className="text-white/60">Point {index + 1} → {index + 2}</span>
                    <span className="text-white font-medium">{formatDistance(dist)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {isActive ? (
              <>
                <button
                  onClick={undoPoint}
                  disabled={points.length === 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-medium
                           hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
                <button
                  onClick={handleStopMeasure}
                  className="flex-1 py-3 px-4 rounded-xl bg-field-accent text-field-darker font-semibold
                           hover:bg-field-accent/90 transition-colors"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                {points.length > 0 && (
                  <button
                    onClick={clearPoints}
                    className="py-3 px-4 rounded-xl bg-white/10 text-white font-medium
                             hover:bg-white/20 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={handleStartMeasure}
                  className="flex-1 py-3 px-4 rounded-xl bg-field-accent text-field-darker font-semibold
                           hover:bg-field-accent/90 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  {points.length > 0 ? 'New Measurement' : 'Start Measuring'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
