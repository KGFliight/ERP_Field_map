import { useTrainingStore } from '@/stores/trainingStore';
import type { EnvironmentalCondition } from '@/types';

interface ConditionConfig {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
}

const CONDITIONS: Record<EnvironmentalCondition, ConditionConfig> = {
  night_patrol: {
    label: 'Night Patrol',
    icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    bgColor: 'bg-indigo-900/90',
    textColor: 'text-indigo-200',
  },
  animal_down: {
    label: 'Animal Down',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    bgColor: 'bg-orange-600/90',
    textColor: 'text-orange-100',
  },
  person_injured: {
    label: 'Person Injured',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    bgColor: 'bg-red-600/90',
    textColor: 'text-red-100',
  },
  radio_blackout: {
    label: 'Radio Blackout',
    icon: 'M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3',
    bgColor: 'bg-gray-700/90',
    textColor: 'text-gray-200',
  },
  storm_incoming: {
    label: 'Storm Incoming',
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    bgColor: 'bg-slate-700/90',
    textColor: 'text-slate-200',
  },
  low_visibility: {
    label: 'Low Visibility',
    icon: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
    bgColor: 'bg-amber-700/90',
    textColor: 'text-amber-100',
  },
};

export function EnvironmentalBanner() {
  const { activeEnvironmentalCondition, isTrainingMode } = useTrainingStore();

  if (!isTrainingMode || !activeEnvironmentalCondition) return null;

  const config = CONDITIONS[activeEnvironmentalCondition];

  return (
    <div className={`w-full ${config.bgColor} backdrop-blur-sm border-b border-white/10`}>
      <div className="flex items-center justify-center gap-2 py-2 px-4">
        <svg className={`w-5 h-5 ${config.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
        </svg>
        <span className={`${config.textColor} font-semibold text-sm`}>
          CONDITION: {config.label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
