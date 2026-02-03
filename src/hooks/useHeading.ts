import { useEffect, useRef, useCallback, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

interface HeadingOptions {
  smoothingFactor?: number; // 0-1, lower = more smoothing
  useDeviceOrientation?: boolean;
  fallbackToGPS?: boolean;
}

const DEFAULT_OPTIONS: HeadingOptions = {
  smoothingFactor: 0.15, // Low-pass filter factor
  useDeviceOrientation: true,
  fallbackToGPS: true,
};

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Apply low-pass filter for smoothing
 */
function lowPassFilter(
  newValue: number,
  oldValue: number,
  factor: number
): number {
  // Handle wrap-around at 0/360
  let diff = newValue - oldValue;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return normalizeAngle(oldValue + diff * factor);
}

export function useHeading(options: HeadingOptions = {}) {
  const setHeading = useMapStore((state) => state.setHeading);
  const position = useMapStore((state) => state.position);
  const heading = useMapStore((state) => state.heading);

  const [permissionState, setPermissionState] = useState<
    'prompt' | 'granted' | 'denied' | 'unavailable'
  >('prompt');

  const lastHeadingRef = useRef<number>(0);
  const hasDeviceOrientationRef = useRef(false);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Handle device orientation events
  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      // Check for absolute orientation (compass)
      // webkitCompassHeading is iOS specific
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      let compassHeading: number | null = null;

      if (webkitHeading !== undefined && webkitHeading !== null) {
        // iOS: webkitCompassHeading is the heading
        compassHeading = webkitHeading;
      } else if (event.alpha !== null && event.absolute) {
        // Android/Other: alpha is compass heading when absolute is true
        compassHeading = 360 - event.alpha;
      } else if (event.alpha !== null) {
        // Fallback: use alpha even if not absolute (less accurate)
        compassHeading = 360 - event.alpha;
      }

      if (compassHeading !== null) {
        hasDeviceOrientationRef.current = true;
        const smoothed = lowPassFilter(
          compassHeading,
          lastHeadingRef.current,
          mergedOptions.smoothingFactor!
        );
        lastHeadingRef.current = smoothed;

        setHeading({
          heading: smoothed,
          source: 'device',
          accuracy: (event as DeviceOrientationEvent & { webkitCompassAccuracy?: number }).webkitCompassAccuracy,
        });
      }
    },
    [setHeading, mergedOptions.smoothingFactor]
  );

  // Request permission for device orientation (iOS 13+)
  const requestPermission = useCallback(async () => {
    // Check if DeviceOrientationEvent has requestPermission (iOS 13+)
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DOE.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        setPermissionState(permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting device orientation permission:', error);
        setPermissionState('denied');
        return false;
      }
    }

    // Permission not required (Android, older iOS)
    setPermissionState('granted');
    return true;
  }, []);

  // Fall back to GPS heading when device orientation unavailable
  useEffect(() => {
    if (
      !mergedOptions.fallbackToGPS ||
      hasDeviceOrientationRef.current ||
      !position
    ) {
      return;
    }

    // Use GPS course over ground if available and moving
    if (
      position.heading !== null &&
      position.speed !== null &&
      position.speed > 0.5 // Only use when moving > 0.5 m/s
    ) {
      const gpsHeading = position.heading;
      const smoothed = lowPassFilter(
        gpsHeading,
        lastHeadingRef.current,
        mergedOptions.smoothingFactor!
      );
      lastHeadingRef.current = smoothed;

      setHeading({
        heading: smoothed,
        source: 'gps',
      });
    }
  }, [position, mergedOptions.fallbackToGPS, mergedOptions.smoothingFactor, setHeading]);

  // Set up device orientation listener
  useEffect(() => {
    if (!mergedOptions.useDeviceOrientation) return;

    // Check if device orientation is supported
    if (!('DeviceOrientationEvent' in window)) {
      setPermissionState('unavailable');
      return;
    }

    // Add event listener
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);

    return () => {
      window.removeEventListener(
        'deviceorientation',
        handleDeviceOrientation,
        true
      );
    };
  }, [handleDeviceOrientation, mergedOptions.useDeviceOrientation]);

  return {
    heading,
    permissionState,
    requestPermission,
    hasDeviceOrientation: hasDeviceOrientationRef.current,
  };
}
