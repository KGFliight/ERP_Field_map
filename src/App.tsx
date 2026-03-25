import { useEffect, useCallback, useLayoutEffect } from 'react';
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
import { TrainingControls } from '@/components/TrainingControls';
import { EnvironmentalBanner } from '@/components/EnvironmentalBanner';
import { AppPermissionsBanner } from '@/components/AppPermissionsBanner';
import { AppPermissionsModal } from '@/components/AppPermissionsModal';
import { ScenarioModal } from '@/components/ScenarioModal';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHeading } from '@/hooks/useHeading';
import { useSync } from '@/hooks/useSync';
import { useMarkerStore } from '@/stores/markerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMeasureStore } from '@/stores/measureStore';
import { useOnboardingStore, hasCompletedOnboarding } from '@/stores/onboardingStore';
import { useAppPermissionsStore } from '@/stores/appPermissionsStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { compassRelevantForPermissions } from '@/utils/orientationPermission';

function App() {
  const tryStartOnFirstVisit = useOnboardingStore((s) => s.tryStartOnFirstVisit);
  const isOnboardingActive = useOnboardingStore((s) => s.isActive);
  const modalOpen = useAppPermissionsStore((s) => s.modalOpen);
  const closePermissionsModal = useAppPermissionsStore((s) => s.closeModal);

  const { getCurrentPosition, geolocationPermission } = useGeolocation({
    paused: isOnboardingActive,
  });
  const { requestPermission: requestCompassPermission, permissionState: compassPermissionState } =
    useHeading();
  const { isTrainingMode, activeEnvironmentalCondition } = useTrainingStore();
  useSync();

  const geoOk =
    geolocationPermission === 'granted' || geolocationPermission === 'unsupported';
  const compassOk =
    !compassRelevantForPermissions() ||
    compassPermissionState === 'granted' ||
    compassPermissionState === 'unavailable';

  const showPermissionBanner =
    hasCompletedOnboarding() && (!geoOk || !compassOk);

  useLayoutEffect(() => {
    if (!modalOpen) return;
    if (geoOk && compassOk) {
      closePermissionsModal();
    }
  }, [modalOpen, geoOk, compassOk, closePermissionsModal]);

  const requestAllPermissions = useCallback(async () => {
    getCurrentPosition();
    if (compassRelevantForPermissions()) {
      try {
        await requestCompassPermission();
      } catch (e) {
        console.warn('Compass permission request failed:', e);
      }
    }
  }, [getCurrentPosition, requestCompassPermission]);

  useEffect(() => {
    useMarkerStore.getState().loadMarkers();
    useSettingsStore.getState().loadSettings();
    useMeasureStore.getState().loadMeasurement();
  }, []);

  useEffect(() => {
    tryStartOnFirstVisit();
  }, [tryStartOnFirstVisit]);

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

      <div className="absolute top-14 left-0 right-0 z-[19] flex flex-col">
        <EnvironmentalBanner />
        <AppPermissionsBanner visible={showPermissionBanner} />
      </div>

      <div
        className="absolute inset-0"
        style={{
          paddingTop: `calc(3.5rem + ${(isTrainingMode && activeEnvironmentalCondition ? 44 : 0) + (showPermissionBanner ? 28 : 0)}px)`,
        }}
        data-onboarding-target="map"
      >
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

      {/* Training UI */}
      <TrainingControls />
      <ScenarioModal />

      {/* Modal dialogs */}
      <MarkerEditor />
      <DownloadPrompt />

      {/* iOS PWA install prompt */}
      <InstallPrompt />

      <AppPermissionsModal
        geolocationPermission={geolocationPermission}
        compassPermissionState={compassPermissionState}
        onEnable={requestAllPermissions}
      />

      <OnboardingTutorial />
    </div>
  );
}

export default App;
