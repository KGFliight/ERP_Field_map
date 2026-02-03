import { SyncStatus } from './SyncStatus';
import { useState } from 'react';

export function Header() {
  const [flightLogoError, setFlightLogoError] = useState(false);
  const [erpLogoError, setErpLogoError] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-field-darker/90 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Logos */}
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

        {/* App title (mobile-friendly) */}
        <div className="hidden sm:block">
          <h1 className="text-white font-semibold text-lg">ERP Field Map</h1>
        </div>

        {/* Sync status */}
        <SyncStatus />
      </div>
    </header>
  );
}
