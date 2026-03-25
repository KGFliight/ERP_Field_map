import { SyncStatus } from './SyncStatus';
import { useState } from 'react';
import { useTrainingStore } from '@/stores/trainingStore';

export function Header() {
  const [flightLogoError, setFlightLogoError] = useState(false);
  const [erpLogoError, setErpLogoError] = useState(false);
  const { isTrainingMode, exitTrainingMode } = useTrainingStore();

  return (
    <header className={`absolute top-0 left-0 right-0 z-20 backdrop-blur-sm border-b transition-colors ${
      isTrainingMode 
        ? 'bg-amber-900/90 border-amber-500/30' 
        : 'bg-field-darker/90 border-white/10'
    }`}>
      <div className="relative flex items-center justify-between h-14 px-4">
        {/* Logos - Left side */}
        <div className="flex items-center gap-3">
          {!flightLogoError ? (
            <img
              src="/brand/flight-tech-logo.png"
              alt="Flight Technologies"
              className="h-8 w-auto object-contain"
              onError={() => setFlightLogoError(true)}
            />
          ) : (
            <div className="h-8 px-2 flex items-center bg-white/10 rounded text-xs text-white/60 font-medium">
              Flight Tech
            </div>
          )}
          <div className="w-px h-6 bg-white/20" />
          {!erpLogoError ? (
            <img
              src="/brand/erp-logo.png"
              alt="ERP"
              className="h-8 w-auto object-contain"
              onError={() => setErpLogoError(true)}
            />
          ) : (
            <div className="h-8 px-2 flex items-center bg-white/10 rounded text-xs text-white/60 font-medium">
              ERP
            </div>
          )}
        </div>

        {/* Training Mode Status - Absolutely centered */}
        {isTrainingMode && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-amber-300 text-sm font-semibold tracking-wide">
              TRAINING MODE
            </span>
            <button
              onClick={exitTrainingMode}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all touch-manipulation active:scale-95
                       bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit
            </button>
          </div>
        )}

        {/* Sync status - Right side */}
        <SyncStatus />
      </div>
    </header>
  );
}
