import { useState } from 'react';
import { useTrainingStore } from '@/stores/trainingStore';
import type { TrainingAssetType, TrainingAssetCategory } from '@/types';

interface AssetOption {
  type: TrainingAssetType;
  category: TrainingAssetCategory;
  label: string;
  icon: string;
}

const TARGET_ASSETS: AssetOption[] = [
  { type: 'poacher', category: 'target', label: 'Poacher', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'poacher_armed', category: 'target', label: 'Armed', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-3-3l3 3 3-3' },
  { type: 'poacher_vehicle', category: 'target', label: 'Vehicle', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' },
  { type: 'snare', category: 'target', label: 'Snare', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
  { type: 'injured_animal', category: 'target', label: 'Animal', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
];

const FRIENDLY_ASSETS: AssetOption[] = [
  { type: 'ranger', category: 'friendly', label: 'Ranger', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'ranger_team', category: 'friendly', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { type: 'vehicle', category: 'friendly', label: 'Vehicle', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' },
  { type: 'helicopter', category: 'friendly', label: 'Heli', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { type: 'base_camp', category: 'friendly', label: 'Camp', icon: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8' },
  { type: 'checkpoint', category: 'friendly', label: 'Check', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

type TabType = 'targets' | 'friendlies';

export function TrainingToolbar() {
  const {
    isTrainingMode,
    placementMode,
    setPlacementMode,
    selectedAssetType,
    setSelectedAssetType,
    selectedAssetId,
    removeTrainingAsset,
    trainingAssets,
  } = useTrainingStore();

  const [activeTab, setActiveTab] = useState<TabType>('targets');
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isTrainingMode) return null;

  const handleAssetClick = (option: AssetOption) => {
    if (selectedAssetType === option.type) {
      // Deselect
      setSelectedAssetType(null);
      setPlacementMode('none');
    } else {
      setSelectedAssetType(option.type);
      setPlacementMode(option.category);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedAssetId) {
      removeTrainingAsset(selectedAssetId);
    }
  };

  const currentAssets = activeTab === 'targets' ? TARGET_ASSETS : FRIENDLY_ASSETS;
  const selectedAsset = trainingAssets.find(a => a.id === selectedAssetId);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
      {/* Collapsed state - just show expand button */}
      {!isExpanded && (
        <div className="flex justify-center pb-4 pointer-events-auto">
          <button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 rounded-full bg-amber-500 text-amber-950 font-medium shadow-lg
                       hover:bg-amber-400 transition-colors touch-manipulation active:scale-95"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Place Assets
            </div>
          </button>
        </div>
      )}

      {/* Expanded toolbar */}
      {isExpanded && (
        <div className="bg-field-darker/95 backdrop-blur-sm border-t border-white/10 pointer-events-auto">
          {/* Header with tabs and collapse */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('targets')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'targets'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Targets
              </button>
              <button
                onClick={() => setActiveTab('friendlies')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'friendlies'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Friendlies
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Delete selected button */}
              {selectedAssetId && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium
                           border border-red-500/30 hover:bg-red-500/30 transition-colors
                           touch-manipulation active:scale-95"
                >
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </div>
                </button>
              )}

              {/* Collapse button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Asset grid */}
          <div className="px-3 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {currentAssets.map((option) => {
                const isSelected = selectedAssetType === option.type;
                const bgColor = option.category === 'target' ? 'bg-red-500' : 'bg-green-500';
                const selectedBg = option.category === 'target' ? 'bg-red-500/30' : 'bg-green-500/30';
                const borderColor = option.category === 'target' ? 'border-red-500' : 'border-green-500';

                return (
                  <button
                    key={option.type}
                    onClick={() => handleAssetClick(option)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all touch-manipulation active:scale-95 flex-shrink-0
                      ${isSelected
                        ? `${selectedBg} border-2 ${borderColor}`
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center`}>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={option.icon} />
                      </svg>
                    </div>
                    <span className="text-white/80 text-xs font-medium whitespace-nowrap">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status bar */}
          {(placementMode !== 'none' || selectedAsset) && (
            <div className="px-3 pb-3">
              {placementMode !== 'none' && (
                <div className="text-center py-1.5 px-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                  <span className="text-amber-300 text-sm">
                    Tap map to place {selectedAssetType?.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {selectedAsset && placementMode === 'none' && (
                <div className="text-center py-1.5 px-3 bg-white/10 rounded-lg">
                  <span className="text-white/70 text-sm">
                    Selected: {selectedAsset.name} - Tap delete to remove
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
