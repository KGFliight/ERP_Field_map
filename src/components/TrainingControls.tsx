import { useState } from 'react';
import { useTrainingStore } from '@/stores/trainingStore';
import type { TrainingAssetType, TrainingAssetCategory, EnvironmentalCondition } from '@/types';

interface AssetOption {
  type: TrainingAssetType;
  label: string;
  icon: string;
}

const TARGET_ASSETS: AssetOption[] = [
  { type: 'poacher', label: 'Poacher', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'poacher_armed', label: 'Armed', icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0v6m-3-3l3 3 3-3' },
  { type: 'poacher_vehicle', label: 'Vehicle', icon: 'M8 17h8M5 11h14l-1.5-6H6.5L5 11zm0 0v4a1 1 0 001 1h1m12-5v4a1 1 0 01-1 1h-1M7 16h.01M17 16h.01' },
  { type: 'snare', label: 'Snare', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zm0 0v5m-3-2l3 2 3-2M9 6l3 3 3-3' },
  { type: 'injured_animal', label: 'Animal', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
];

const FRIENDLY_ASSETS: AssetOption[] = [
  { type: 'ranger', label: 'Ranger', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'ranger_team', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { type: 'vehicle', label: 'Vehicle', icon: 'M8 17h8M5 11h14l-1.5-6H6.5L5 11zm0 0v4a1 1 0 001 1h1m12-5v4a1 1 0 01-1 1h-1M7 16h.01M17 16h.01' },
  { type: 'helicopter', label: 'Heli', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { type: 'base_camp', label: 'Camp', icon: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8' },
  { type: 'checkpoint', label: 'Check', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const CONDITION_LABELS: Record<EnvironmentalCondition, { label: string; color: string }> = {
  night_patrol: { label: 'Night Patrol', color: 'bg-indigo-500' },
  animal_down: { label: 'Animal Down', color: 'bg-orange-500' },
  person_injured: { label: 'Person Injured', color: 'bg-red-500' },
  radio_blackout: { label: 'Radio Blackout', color: 'bg-gray-500' },
  storm_incoming: { label: 'Storm Incoming', color: 'bg-slate-500' },
  low_visibility: { label: 'Low Visibility', color: 'bg-amber-600' },
};

type ExpandedMenu = 'none' | 'targets' | 'friendlies' | 'scenario';

export function TrainingControls() {
  const {
    isTrainingMode,
    placementMode,
    setPlacementMode,
    selectedAssetType,
    setSelectedAssetType,
    selectedAssetId,
    selectAsset,
    removeTrainingAsset,
    isDrawingMode,
    setDrawingMode,
    isDeleteMode,
    setDeleteMode,
    selectedStrokeId,
    deleteStroke,
    clearAllAssets,
    clearAllDrawings,
    trainingAssets,
    drawingStrokes,
    currentDrawingColor,
    setDrawingColor,
    undoLastStroke,
    activeCards,
    activeEnvironmentalCondition,
    randomizeScenario,
    clearScenario,
  } = useTrainingStore();

  const COLORS = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#22c55e', label: 'Green' },
    { value: '#ef4444', label: 'Red' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#ffffff', label: 'White' },
  ];

  const [expandedMenu, setExpandedMenu] = useState<ExpandedMenu>('none');

  if (!isTrainingMode) return null;

  const handleAssetSelect = (type: TrainingAssetType, category: TrainingAssetCategory) => {
    if (selectedAssetType === type) {
      // Deselect the currently selected asset
      setSelectedAssetType(null);
      setPlacementMode('none');
    } else {
      // Select new asset - setPlacementMode handles disabling other modes
      setPlacementMode(category);
      setSelectedAssetType(type);
    }
  };

  const handleToggleTargets = () => {
    if (expandedMenu === 'targets') {
      setExpandedMenu('none');
      if (placementMode === 'target') {
        setSelectedAssetType(null);
        setPlacementMode('none');
      }
    } else {
      setExpandedMenu('targets');
      setDrawingMode(false);
      setDeleteMode(false);
    }
  };

  const handleToggleFriendlies = () => {
    if (expandedMenu === 'friendlies') {
      setExpandedMenu('none');
      if (placementMode === 'friendly') {
        setSelectedAssetType(null);
        setPlacementMode('none');
      }
    } else {
      setExpandedMenu('friendlies');
      setDrawingMode(false);
      setDeleteMode(false);
    }
  };

  const handleDrawMode = () => {
    setExpandedMenu('none');
    setSelectedAssetType(null);
    setPlacementMode('none');
    setDeleteMode(false);
    setDrawingMode(!isDrawingMode);
  };

  const handleDeleteMode = () => {
    setExpandedMenu('none');
    setSelectedAssetType(null);
    setPlacementMode('none');
    setDrawingMode(false);
    setDeleteMode(!isDeleteMode);
  };

  const handleDelete = () => {
    if (selectedAssetId) {
      removeTrainingAsset(selectedAssetId);
      selectAsset(null);
    }
    if (selectedStrokeId) {
      deleteStroke(selectedStrokeId);
    }
  };

  const handleClearAll = () => {
    clearAllAssets();
    clearAllDrawings();
    clearScenario();
    setExpandedMenu('none');
    setSelectedAssetType(null);
    setPlacementMode('none');
    setDrawingMode(false);
    setDeleteMode(false);
  };

  const handleToggleScenario = () => {
    if (expandedMenu === 'scenario') {
      setExpandedMenu('none');
    } else {
      setExpandedMenu('scenario');
      setDrawingMode(false);
      setDeleteMode(false);
      setSelectedAssetType(null);
      setPlacementMode('none');
    }
  };

  const handleRegenerate = () => {
    randomizeScenario();
  };

  const hasContent = trainingAssets.length > 0 || drawingStrokes.length > 0;
  const hasScenario = activeCards.length > 0;
  
  // Count targets and friendlies
  const targetCount = trainingAssets.filter(a => a.category === 'target').length;
  const friendlyCount = trainingAssets.filter(a => a.category === 'friendly').length;
  const hasSelection = selectedAssetId || selectedStrokeId;

  return (
    <div className="absolute top-24 left-4 z-10 flex flex-col gap-2">
      <div className="flex flex-col gap-2" data-onboarding-target="training-assets">
      {/* Targets button with expandable menu */}
      <div className="relative">
        <button
          onClick={handleToggleTargets}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-all
                     touch-manipulation active:scale-95
                     ${expandedMenu === 'targets' || placementMode === 'target'
                       ? 'bg-red-500 text-white'
                       : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title="Place Targets"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </button>

        {/* Expanded targets menu */}
        {expandedMenu === 'targets' && (
          <div className="absolute left-14 top-0 flex gap-1 bg-field-darker/95 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-red-500/30">
            {TARGET_ASSETS.map((asset) => (
              <button
                key={asset.type}
                onClick={() => handleAssetSelect(asset.type, 'target')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all touch-manipulation active:scale-95
                  ${selectedAssetType === asset.type
                    ? 'bg-red-500/30 border border-red-500'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                title={asset.label}
              >
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={asset.icon} />
                  </svg>
                </div>
                <span className="text-white/80 text-[10px] font-medium">{asset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Friendlies button with expandable menu */}
      <div className="relative">
        <button
          onClick={handleToggleFriendlies}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-all
                     touch-manipulation active:scale-95
                     ${expandedMenu === 'friendlies' || placementMode === 'friendly'
                       ? 'bg-green-500 text-white'
                       : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title="Place Friendlies"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </button>

        {/* Expanded friendlies menu */}
        {expandedMenu === 'friendlies' && (
          <div className="absolute left-14 top-0 flex gap-1 bg-field-darker/95 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-green-500/30">
            {FRIENDLY_ASSETS.map((asset) => (
              <button
                key={asset.type}
                onClick={() => handleAssetSelect(asset.type, 'friendly')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all touch-manipulation active:scale-95
                  ${selectedAssetType === asset.type
                    ? 'bg-green-500/30 border border-green-500'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                title={asset.label}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={asset.icon} />
                  </svg>
                </div>
                <span className="text-white/80 text-[10px] font-medium">{asset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Draw button with expanded options */}
      <div className="relative" data-onboarding-target="training-draw">
        <button
          onClick={handleDrawMode}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-all
                     touch-manipulation active:scale-95
                     ${isDrawingMode
                       ? 'bg-amber-500 text-amber-950'
                       : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title="Draw Mode"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Drawing tools when in draw mode */}
        {isDrawingMode && (
          <div className="absolute left-14 top-0 flex items-center gap-2 bg-field-darker/95 backdrop-blur-sm rounded-xl p-2 shadow-xl border border-amber-500/30">
            {/* Color swatches */}
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setDrawingColor(color.value)}
                className={`w-8 h-8 rounded-full transition-all touch-manipulation ${
                  currentDrawingColor === color.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-field-darker scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
            
            {/* Divider */}
            <div className="w-px h-6 bg-white/20" />
            
            {/* Undo button */}
            <button
              onClick={undoLastStroke}
              disabled={drawingStrokes.length === 0}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                       hover:bg-white/20 transition-colors touch-manipulation active:scale-95
                       disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={isDeleteMode && hasSelection ? handleDelete : handleDeleteMode}
        disabled={isDeleteMode && !hasSelection && !hasContent}
        className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                   flex items-center justify-center transition-all
                   touch-manipulation active:scale-95
                   disabled:opacity-30 disabled:cursor-not-allowed
                   ${isDeleteMode
                     ? hasSelection 
                       ? 'bg-red-600 text-white animate-pulse' 
                       : 'bg-red-500 text-white'
                     : 'bg-field-darker/90 text-white hover:bg-field-darker'
                   }`}
        title={isDeleteMode ? (hasSelection ? 'Delete Selected' : 'Tap item to select') : 'Delete Mode'}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Clear All button */}
      <button
        onClick={handleClearAll}
        disabled={!hasContent}
        className="w-12 h-12 rounded-full bg-field-darker/90 backdrop-blur-sm shadow-lg 
                   flex items-center justify-center transition-all
                   touch-manipulation active:scale-95
                   text-white hover:bg-field-darker
                   disabled:opacity-30 disabled:cursor-not-allowed"
        title="Clear All Training Content"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-white/20 mx-auto" />

      {/* Random Scenario button with expandable panel */}
      <div className="relative" data-onboarding-target="training-scenario">
        <button
          onClick={handleToggleScenario}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-all
                     touch-manipulation active:scale-95
                     ${expandedMenu === 'scenario' || hasScenario
                       ? 'bg-orange-500 text-white'
                       : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title="Random Scenario"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* Expanded scenario panel */}
        {expandedMenu === 'scenario' && (
          <div className="absolute left-14 top-0 bg-field-darker/95 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-orange-500/30 w-72">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold text-sm">Random Scenario</span>
              {hasScenario && (
                <button
                  onClick={clearScenario}
                  className="text-white/50 hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Generate/Regenerate button */}
            <button
              onClick={handleRegenerate}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 
                       text-white font-semibold text-sm shadow-lg
                       hover:from-orange-400 hover:to-amber-400 transition-all 
                       touch-manipulation active:scale-[0.98] mb-3"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {hasScenario ? 'Regenerate' : 'Generate Scenario'}
              </div>
            </button>

            {/* Scenario content */}
            {hasScenario ? (
              <div className="space-y-2">
                {/* Summary */}
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/70 text-xs mb-1">Summary</div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-red-400">{targetCount} targets</span>
                    <span className="text-green-400">{friendlyCount} friendlies</span>
                  </div>
                </div>

                {/* Condition */}
                {activeEnvironmentalCondition && (
                  <div className="bg-white/5 rounded-lg p-2">
                    <div className="text-white/70 text-xs mb-1">Condition</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${CONDITION_LABELS[activeEnvironmentalCondition].color}`} />
                      <span className="text-white text-sm font-medium">
                        {CONDITION_LABELS[activeEnvironmentalCondition].label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cards */}
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-white/70 text-xs mb-1">Active Cards</div>
                  <div className="space-y-1">
                    {activeCards.map((card) => (
                      <div key={card.id} className="flex items-center gap-2 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          card.category === 'targets' ? 'bg-red-400' :
                          card.category === 'friendlies' ? 'bg-green-400' : 'bg-blue-400'
                        }`} />
                        <span className="text-white/80">{card.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="text-white/40 text-xs">
                  Generate a random scenario with targets, friendlies, and conditions
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator - positioned at top center of screen */}
      {(placementMode !== 'none' || isDrawingMode || isDeleteMode) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 bg-field-darker/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-xl border border-amber-500/30">
          <span className="text-amber-300 text-sm font-medium">
            {placementMode !== 'none' && `Tap map to place ${selectedAssetType?.replace(/_/g, ' ')}`}
            {isDrawingMode && 'Draw on the map'}
            {isDeleteMode && (hasSelection ? 'Tap delete to confirm' : 'Tap item to select')}
          </span>
        </div>
      )}
    </div>
  );
}
