import { useState } from 'react';
import { useAppPermissionsStore } from '@/stores/appPermissionsStore';
import type { GeolocationPermissionState } from '@/hooks/useGeolocation';
import { compassRelevantForPermissions } from '@/utils/orientationPermission';

type CompassState = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface AppPermissionsModalProps {
  geolocationPermission: GeolocationPermissionState;
  compassPermissionState: CompassState;
  onEnable: () => Promise<void>;
}

export function AppPermissionsModal({
  geolocationPermission,
  compassPermissionState,
  onEnable,
}: AppPermissionsModalProps) {
  const { modalOpen, closeModal } = useAppPermissionsStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!modalOpen) return null;

  const needsCompass = compassRelevantForPermissions();
  const compassBlocking =
    needsCompass &&
    compassPermissionState !== 'granted' &&
    compassPermissionState !== 'unavailable';
  const geoBlocking =
    geolocationPermission !== 'unsupported' &&
    geolocationPermission !== 'granted';

  const handleEnable = async () => {
    setError(null);
    setBusy(true);
    try {
      await onEnable();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable permissions');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (!busy) {
      setError(null);
      closeModal();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[199] flex items-center justify-center p-4 font-field"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-permissions-title"
    >
      <div className="bg-field-darker rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 id="app-permissions-title" className="text-white font-semibold text-lg pr-2">
            {needsCompass ? 'Location & heading' : 'Location access'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-white/75 text-sm leading-relaxed">
            For full functionality—your position on the map, follow mode, distance cues, and compass
            heading when supported—the app needs access to{' '}
            <span className="text-white/90 font-medium">device location</span>
            {needsCompass ? (
              <>
                {' '}
                and{' '}
                <span className="text-white/90 font-medium">motion &amp; orientation</span>
              </>
            ) : null}
            . You can change this anytime in the browser or system settings.
          </p>

          {(geoBlocking || compassBlocking) && (
            <ul className="text-sm text-white/60 space-y-1.5 list-disc pl-5">
              {geoBlocking && (
                <li>
                  Location:{' '}
                  {geolocationPermission === 'denied'
                    ? 'blocked — allow location for this site if you want GPS on the map.'
                    : 'waiting for your choice in the browser prompt.'}
                </li>
              )}
              {compassBlocking && (
                <li>
                  Compass heading:{' '}
                  {compassPermissionState === 'denied'
                    ? 'blocked — enable motion/orientation access if you want the map to align with direction of travel.'
                    : 'tap Allow below, then confirm when the system asks.'}
                </li>
              )}
            </ul>
          )}

          {error && (
            <div className="p-3 bg-field-danger/20 rounded-lg border border-field-danger/30">
              <p className="text-field-danger text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="flex-1 py-3 px-4 rounded-xl bg-field-accent text-field-darker font-semibold hover:bg-field-accent/90 transition-colors disabled:opacity-50"
          >
            {busy ? 'Requesting…' : needsCompass ? 'Allow location & heading' : 'Allow location'}
          </button>
        </div>
      </div>
    </div>
  );
}
