import { useTrainingStore } from '@/stores/trainingStore';
import { ScenarioCards } from './ScenarioCards';

export function TrainingPanel() {
  const {
    showTrainingPanel,
    setShowTrainingPanel,
    trainingAssets,
    activeCards,
    randomizeScenario,
    clearScenario,
    drawingStrokes,
  } = useTrainingStore();

  if (!showTrainingPanel) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowTrainingPanel(false)}
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Random Scenario</h2>
              <p className="text-white/50 text-xs">
                {trainingAssets.length} assets • {drawingStrokes.length} drawings
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTrainingPanel(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(70vh-120px)]">
          <div className="space-y-4">
            {/* Randomize button */}
            <button
              onClick={randomizeScenario}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 
                       text-white font-semibold text-lg shadow-lg shadow-amber-500/25
                       hover:from-amber-400 hover:to-orange-400 transition-all 
                       touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate Random Scenario
              </div>
            </button>

            {/* Active scenario cards */}
            {activeCards.length > 0 && (
              <>
                <ScenarioCards cards={activeCards} />
                
                <button
                  onClick={clearScenario}
                  className="w-full py-2 px-4 rounded-lg bg-white/10 text-white/70 text-sm font-medium
                           hover:bg-white/20 transition-colors touch-manipulation active:scale-[0.98]"
                >
                  Clear Scenario
                </button>
              </>
            )}

            {/* Instructions */}
            {activeCards.length === 0 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-amber-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-white/50 text-sm">
                  Tap to generate a random training scenario
                </p>
                <p className="text-white/30 text-xs mt-1">
                  Draws cards for targets, friendlies, and conditions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
