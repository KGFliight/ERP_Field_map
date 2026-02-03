import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';

export function OfflineWarning() {
  const { hasOfflineBasemap } = useMapStore();
  const { status } = useSyncStore();

  // Don't show warning if we have online fallback tiles configured
  const hasFallbackTiles = !!import.meta.env.VITE_ONLINE_SATELLITE_URL;

  // Show warning if offline AND no offline basemap AND no fallback tiles
  const showWarning =
    (status.state === 'offline' || !navigator.onLine) && !hasOfflineBasemap && !hasFallbackTiles;

  if (!showWarning) return null;

  return (
    <div className="absolute top-16 left-4 right-4 z-10">
      <div className="bg-field-warning/90 backdrop-blur-sm rounded-lg px-4 py-3 
                      flex items-center gap-3 shadow-lg">
        <svg
          className="w-5 h-5 text-field-darker flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-field-darker font-medium text-sm">
            Offline basemap not downloaded
          </p>
          <p className="text-field-darker/70 text-xs">
            Connect to the internet to download the satellite basemap for offline use.
          </p>
        </div>
      </div>
    </div>
  );
}
