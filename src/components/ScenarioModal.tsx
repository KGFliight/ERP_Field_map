import { useTrainingStore } from '@/stores/trainingStore';
import type { EnvironmentalCondition } from '@/types';

const CONDITION_DETAILS: Record<EnvironmentalCondition, { 
  label: string; 
  icon: string;
  briefing: string;
  tactics: string;
}> = {
  night_patrol: { 
    label: 'NIGHT OPS', 
    icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    briefing: 'Operations during hours of darkness. Limited natural visibility.',
    tactics: 'Use NVG/thermal imaging. Silent movement. No white light sources.',
  },
  animal_down: { 
    label: 'ANIMAL DOWN', 
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    briefing: 'Injured/deceased animal located. Possible poaching activity.',
    tactics: 'Secure 200m perimeter. Document evidence. Poachers may return.',
  },
  person_injured: { 
    label: 'CASEVAC', 
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    briefing: 'Personnel casualty requiring immediate medical evacuation.',
    tactics: 'Stabilize patient. Clear extraction zone. Maintain security.',
  },
  radio_blackout: { 
    label: 'COMMS DOWN', 
    icon: 'M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3',
    briefing: 'Radio communications compromised or unavailable.',
    tactics: 'Use visual signals. Rally at waypoints. Runner protocol active.',
  },
  storm_incoming: { 
    label: 'SEVERE WX', 
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    briefing: 'Severe weather approaching operational area.',
    tactics: 'Complete objectives or seek shelter. No air support available.',
  },
  low_visibility: { 
    label: 'LOW VIS', 
    icon: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
    briefing: 'Fog, dust, or smoke reducing visibility to under 100m.',
    tactics: 'GPS navigation essential. Thermal detection advantage.',
  },
};

export function ScenarioModal() {
  const {
    showScenarioModal,
    setShowScenarioModal,
    activeCards,
    activeEnvironmentalCondition,
    trainingAssets,
    randomizeScenario,
  } = useTrainingStore();

  if (!showScenarioModal || activeCards.length === 0) return null;

  const targetCount = trainingAssets.filter(a => a.category === 'target').length;
  const friendlyCount = trainingAssets.filter(a => a.category === 'friendly').length;
  const condition = activeEnvironmentalCondition ? CONDITION_DETAILS[activeEnvironmentalCondition] : null;
  
  const targetCard = activeCards.find(c => c.category === 'targets');
  const friendlyCard = activeCards.find(c => c.category === 'friendlies');

  const handleRegenerate = () => {
    randomizeScenario();
  };

  const handleAccept = () => {
    setShowScenarioModal(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/80"
        onClick={handleAccept}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-field-darker border border-white/10 rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-field-dark border-b border-white/10 px-4 py-3 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm">TRAINING BRIEFING</h2>
                  <p className="text-white/40 text-xs">Scenario Generated</p>
                </div>
              </div>
              <button 
                onClick={handleAccept}
                className="text-white/40 hover:text-white/60 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Environmental Modifier */}
            {condition && (
              <div className="bg-field-dark border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={condition.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-xs tracking-wider">MODIFIER</span>
                      <span className="text-amber-300 font-semibold text-sm">{condition.label}</span>
                    </div>
                    <p className="text-white/70 text-xs mt-0.5">{condition.briefing}</p>
                    <p className="text-amber-400/80 text-xs mt-1 italic">{condition.tactics}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-field-dark border border-red-500/20 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-red-400 text-xl font-bold leading-none">{targetCount}</div>
                    <div className="text-red-400/60 text-[10px] uppercase tracking-wider">Threats</div>
                  </div>
                </div>
              </div>
              <div className="bg-field-dark border border-green-500/20 rounded-lg p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-green-400 text-xl font-bold leading-none">{friendlyCount}</div>
                    <div className="text-green-400/60 text-[10px] uppercase tracking-wider">Assets</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mission Cards - Compact */}
            <div className="space-y-2">
              {/* Threat Card */}
              {targetCard && (
                <div className="bg-field-dark border border-red-500/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-red-400/60 text-[10px] uppercase tracking-wider">Threat Intel</span>
                    <span className="text-red-400 font-semibold text-xs">{targetCard.name}</span>
                  </div>
                  <p className="text-white/60 text-xs leading-tight">{targetCard.description}</p>
                </div>
              )}

              {/* Friendly Card */}
              {friendlyCard && (
                <div className="bg-field-dark border border-green-500/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400/60 text-[10px] uppercase tracking-wider">Available</span>
                    <span className="text-green-400 font-semibold text-xs">{friendlyCard.name}</span>
                  </div>
                  <p className="text-white/60 text-xs leading-tight">{friendlyCard.description}</p>
                </div>
              )}
            </div>

            {/* Mission Timestamp */}
            <div className="text-center">
              <span className="text-white/30 text-[10px]">
                Generated {new Date().toLocaleTimeString()} • Offline Ready
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleRegenerate}
              className="flex-1 py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 text-white/80 font-medium text-sm
                       hover:bg-white/10 transition-colors touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Scenario
              </div>
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-2.5 px-3 rounded-lg bg-amber-500/20 border border-amber-500/30 
                       text-amber-400 font-semibold text-sm
                       hover:bg-amber-500/30 transition-colors 
                       touch-manipulation active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Begin
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
