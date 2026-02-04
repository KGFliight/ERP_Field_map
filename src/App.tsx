import { useEffect, useCallback } from 'react';
import { Map } from '@/components/Map';
import { Header } from '@/components/Header';
import { MapControls } from '@/components/MapControls';
import { LayerPanel } from '@/components/LayerPanel';
import { FeaturePopup } from '@/components/FeaturePopup';
import { DownloadPrompt } from '@/components/DownloadPrompt';
import { OfflineWarning } from '@/components/OfflineWarning';
import { MarkerPanel } from '@/components/MarkerPanel';
import { MarkerEditor } from '@/components/MarkerEditor';
import { MeasurePanel } from '@/components/MeasurePanel';
import { DistanceIndicator } from '@/components/DistanceIndicator';
import { RingsPanel } from '@/components/RingsPanel';
import { SearchBar } from '@/components/SearchBar';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHeading } from '@/hooks/useHeading';
import { useSync } from '@/hooks/useSync';
import { useMarkerStore } from '@/stores/markerStore';
import { useSettingsStore } from '@/stores/settingsStore';

function App() {
  // Initialize hooks
  const { getCurrentPosition } = useGeolocation();
  const { requestPermission: requestCompassPermission, permissionState } = useHeading();
  useSync();

  // Request permissions on first user interaction (required for iOS)
  const requestAllPermissions = useCallback(async () => {
    // Request compass permission if needed (iOS 13+)
    if (permissionState === 'prompt') {
      await requestCompassPermission();
    }
    // Request fresh GPS position
    getCurrentPosition();
  }, [permissionState, requestCompassPermission, getCurrentPosition]);

  // Load markers and settings on mount
  useEffect(() => {
    useMarkerStore.getState().loadMarkers();
    useSettingsStore.getState().loadSettings();
    
    // Request permissions after a short delay (allows page to fully load)
    const timer = setTimeout(() => {
      // On iOS, compass permission must be triggered by user gesture
      // We'll show the permission button instead
      // But for geolocation, we can try immediately
      getCurrentPosition();
    }, 500);
    
    // Add one-time click handler for permissions (iOS requires user gesture)
    const handleFirstInteraction = () => {
      requestAllPermissions();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [getCurrentPosition, requestAllPermissions]);

  // Register service worker update handler
  useEffect(() => {
    // Check for service worker updates periodically
    if ('serviceWorker' in navigator) {
      const checkForUpdates = () => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          }
        });
      };

      // Check every 5 minutes
      const interval = setInterval(checkForUpdates, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="relative w-full h-screen bg-field-darker overflow-hidden font-field">
      {/* Header */}
      <Header />

      {/* Map */}
      <div className="absolute inset-0 pt-14">
        <Map />
      </div>

      {/* Offline warning */}
      <OfflineWarning />

      {/* Search bar */}
      <SearchBar />

      {/* Distance to selected marker indicator */}
      <DistanceIndicator />

      {/* Feature popup */}
      <FeaturePopup />

      {/* Map controls */}
      <MapControls />

      {/* Bottom sheet panels */}
      <LayerPanel />
      <MarkerPanel />
      <MeasurePanel />
      <RingsPanel />

      {/* Modal dialogs */}
      <MarkerEditor />
      <DownloadPrompt />

      {/* iOS PWA install prompt */}
      <InstallPrompt />
    </div>
  );
}

export default App;
