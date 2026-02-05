import { useMapStore } from '@/stores/mapStore';
import { useSyncStore } from '@/stores/syncStore';
import { useMarkerStore } from '@/stores/markerStore';
import { useMeasureStore } from '@/stores/measureStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useHeading } from '@/hooks/useHeading';
import { canShowInstallPrompt, triggerInstallPrompt } from './InstallPrompt';

export function MapControls() {
  const { followMode, toggleFollowMode } = useMapStore();
  const { setShowLayerPanel } = useSyncStore();
  const { mode, setMode, setShowMarkerPanel } = useMarkerStore();
  const { isActive: isMeasuring, setShowMeasurePanel } = useMeasureStore();
  const { setShowSettingsPanel } = useSettingsStore();
  const { permissionState, requestPermission } = useHeading();

  // Request compass permission (iOS)
  const handleCompassPermission = async () => {
    await requestPermission();
  };

  // Toggle drop pin mode
  const handleDropPinMode = () => {
    if (mode === 'dropPin') {
      setMode('view');
    } else {
      setMode('dropPin');
    }
  };

  return (
    <>
      {/* Right side controls */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
        {/* Compass permission button (only show if needed on iOS) */}
        {permissionState === 'prompt' && (
          <button
            onClick={handleCompassPermission}
            className="w-12 h-12 rounded-full bg-field-warning/90 backdrop-blur-sm 
                       shadow-lg flex items-center justify-center
                       hover:bg-field-warning transition-colors touch-manipulation active:scale-95"
            title="Enable compass"
          >
            <svg
              className="w-6 h-6 text-field-darker"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
              />
            </svg>
          </button>
        )}

        {/* Layer toggle button */}
        <button
          onClick={() => setShowLayerPanel(true)}
          className="w-12 h-12 rounded-full bg-field-darker/90 backdrop-blur-sm 
                     shadow-lg flex items-center justify-center
                     hover:bg-field-darker transition-colors touch-manipulation active:scale-95"
          title="Toggle layers"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </button>

        {/* Range rings toggle */}
        <button
          onClick={() => setShowSettingsPanel(true)}
          className="w-12 h-12 rounded-full bg-field-darker/90 backdrop-blur-sm 
                     shadow-lg flex items-center justify-center
                     hover:bg-field-darker transition-colors touch-manipulation active:scale-95"
          title="Range rings settings"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <circle cx="12" cy="12" r="6" strokeWidth={2} strokeDasharray="3 2" />
            <circle cx="12" cy="12" r="9" strokeWidth={2} strokeDasharray="3 2" />
          </svg>
        </button>

        {/* Follow mode toggle */}
        <button
          onClick={toggleFollowMode}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-colors 
                     touch-manipulation active:scale-95
                     ${
                       followMode
                         ? 'bg-field-accent text-field-darker'
                         : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title={followMode ? 'Stop following' : 'Follow my location'}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* Install App button (iOS Safari only) */}
        {canShowInstallPrompt() && (
          <button
            onClick={triggerInstallPrompt}
            className="w-12 h-12 rounded-full bg-field-accent/90 backdrop-blur-sm 
                       shadow-lg flex items-center justify-center
                       hover:bg-field-accent transition-colors touch-manipulation active:scale-95"
            title="Install App"
          >
            <svg
              className="w-6 h-6 text-field-darker"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Left side controls - action buttons */}
      <div className="absolute bottom-6 left-4 z-10 flex flex-col gap-2">
        {/* Markers list */}
        <button
          onClick={() => setShowMarkerPanel(true)}
          className="w-12 h-12 rounded-full bg-field-darker/90 backdrop-blur-sm 
                     shadow-lg flex items-center justify-center
                     hover:bg-field-darker transition-colors touch-manipulation active:scale-95"
          title="View markers"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </button>

        {/* Drop pin toggle */}
        <button
          onClick={handleDropPinMode}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-colors 
                     touch-manipulation active:scale-95
                     ${
                       mode === 'dropPin'
                         ? 'bg-field-success text-white'
                         : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title={mode === 'dropPin' ? 'Cancel drop pin' : 'Drop pin'}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        {/* Measure button - ruler icon */}
        <button
          onClick={() => setShowMeasurePanel(true)}
          className={`w-12 h-12 rounded-full backdrop-blur-sm shadow-lg 
                     flex items-center justify-center transition-colors 
                     touch-manipulation active:scale-95
                     ${
                       isMeasuring
                         ? 'bg-field-warning text-field-darker'
                         : 'bg-field-darker/90 text-white hover:bg-field-darker'
                     }`}
          title="Measure distance"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {/* Ruler icon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 2L2 6l16 16 4-4L6 2zm2 8l2-2m2 6l2-2m2 6l2-2"
            />
          </svg>
        </button>
      </div>

      {/* Mode indicator */}
      {(mode === 'dropPin' || isMeasuring) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          <div className={`px-4 py-2 rounded-full shadow-lg text-sm font-medium
            ${mode === 'dropPin' ? 'bg-field-success text-white' : ''}
            ${isMeasuring ? 'bg-field-warning text-field-darker' : ''}
          `}>
            {mode === 'dropPin' && 'Tap map to drop pin'}
            {isMeasuring && 'Tap map to add points'}
          </div>
        </div>
      )}
    </>
  );
}
