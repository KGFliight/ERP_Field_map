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
  { type: 'poacher_vehicle', category: 'target', label: 'Vehicle', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { type: 'snare', category: 'target', label: 'Snare', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { type: 'injured_animal', category: 'target', label: 'Animal', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
];

const FRIENDLY_ASSETS: AssetOption[] = [
  { type: 'ranger', category: 'friendly', label: 'Ranger', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { type: 'ranger_team', category: 'friendly', label: 'Team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { type: 'vehicle', category: 'friendly', label: 'Vehicle', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
  { type: 'helicopter', category: 'friendly', label: 'Heli', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  { type: 'base_camp', category: 'friendly', label: 'Camp', icon: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8' },
  { type: 'checkpoint', category: 'friendly', label: 'Check', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

function AssetButton({ 
  option, 
  isSelected, 
  onClick 
}: { 
  option: AssetOption; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const bgColor = option.category === 'target' ? 'bg-red-500' : 'bg-green-500';
  const selectedBg = option.category === 'target' ? 'bg-red-500/30' : 'bg-green-500/30';
  const borderColor = option.category === 'target' ? 'border-red-500' : 'border-green-500';
  
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all touch-manipulation active:scale-95
        ${isSelected 
          ? `${selectedBg} border-2 ${borderColor}` 
          : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
        }`}
    >
      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={option.icon} />
        </svg>
      </div>
      <span className="text-white/80 text-xs font-medium">{option.label}</span>
    </button>
  );
}

export function TrainingAssetPicker() {
  const { 
    placementMode, 
    setPlacementMode, 
    selectedAssetType, 
    setSelectedAssetType 
  } = useTrainingStore();

  const handleAssetClick = (option: AssetOption) => {
    if (selectedAssetType === option.type) {
      setSelectedAssetType(null);
      setPlacementMode('none');
    } else {
      setSelectedAssetType(option.type);
      setPlacementMode(option.category);
    }
  };

  return (
    <div className="space-y-4">
      {/* Targets */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-white/70 text-sm font-medium">Targets</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {TARGET_ASSETS.map((option) => (
            <AssetButton
              key={option.type}
              option={option}
              isSelected={selectedAssetType === option.type}
              onClick={() => handleAssetClick(option)}
            />
          ))}
        </div>
      </div>

      {/* Friendlies */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-white/70 text-sm font-medium">Friendlies</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {FRIENDLY_ASSETS.map((option) => (
            <AssetButton
              key={option.type}
              option={option}
              isSelected={selectedAssetType === option.type}
              onClick={() => handleAssetClick(option)}
            />
          ))}
        </div>
      </div>

      {/* Instructions */}
      {placementMode !== 'none' && (
        <div className="text-center py-2 px-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
          <span className="text-amber-300 text-sm">
            Tap on the map to place {selectedAssetType?.replace(/_/g, ' ')}
          </span>
        </div>
      )}
    </div>
  );
}
