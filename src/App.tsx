import { useEffect } from 'react';
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
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHeading } from '@/hooks/useHeading';
import { useSync } from '@/hooks/useSync';
import { useMarkerStore } from '@/stores/markerStore';
import { useSettingsStore } from '@/stores/settingsStore';

function App() {
  // Initialize hooks
  useGeolocation();
  useHeading();
  useSync();

  // Load markers and settings on mount
  useEffect(() => {
    useMarkerStore.getState().loadMarkers();
    useSettingsStore.getState().loadSettings();
  }, []);

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
    </div>
  );
}

export default App;
