import { useEffect, useRef, useCallback, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';

interface HeadingOptions {
  smoothingFactor?: number; // 0-1, lower = more smoothing
  useDeviceOrientation?: boolean;
  fallbackToGPS?: boolean;
}

const DEFAULT_OPTIONS: HeadingOptions = {
  smoothingFactor: 0.25, // Slightly higher for faster response while still smoothing
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

/**
 * Get screen orientation offset for compass correction
 * Returns the angle to add to compass reading to correct for device rotation
 */
function getScreenOrientationOffset(): number {
  // Check for screen orientation API (preferred)
  if (typeof screen !== 'undefined' && screen.orientation) {
    // Screen.orientation.angle gives rotation from natural portrait orientation
    // 0 = portrait, 90 = landscape-left, 180 = portrait-upside-down, 270 = landscape-right
    return screen.orientation.angle;
  }
  
  // Fallback for older browsers (iOS Safari, etc)
  if (typeof window !== 'undefined' && window.orientation !== undefined) {
    // window.orientation uses different values:
    // 0 = portrait, 90 = landscape-left, -90/270 = landscape-right, 180 = portrait-upside-down
    const orientation = window.orientation as number;
    return orientation < 0 ? 360 + orientation : orientation;
  }
  
  return 0;
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
  const orientationOffsetRef = useRef<number>(0);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Update orientation offset when screen rotates
  useEffect(() => {
    const updateOrientationOffset = () => {
      orientationOffsetRef.current = getScreenOrientationOffset();
    };

    updateOrientationOffset();
    
    window.addEventListener('orientationchange', updateOrientationOffset);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', updateOrientationOffset);
    }

    return () => {
      window.removeEventListener('orientationchange', updateOrientationOffset);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', updateOrientationOffset);
      }
    };
  }, []);

  // Handle device orientation events
  const handleDeviceOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      // Check for absolute orientation (compass)
      // webkitCompassHeading is iOS specific - gives heading relative to true north
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      let compassHeading: number | null = null;

      if (webkitHeading !== undefined && webkitHeading !== null && !isNaN(webkitHeading)) {
        // iOS: webkitCompassHeading is already correct relative to true north
        // It's independent of screen orientation, so we DON'T add the offset here
        // The heading indicates which direction the TOP of the device is pointing
        compassHeading = normalizeAngle(webkitHeading);
      } else if (event.alpha !== null && !isNaN(event.alpha)) {
        // Android/Other: alpha is rotation around Z axis (compass heading)
        // alpha = 0 when device is pointing north
        // For Android, we need to account for screen orientation
        const screenOffset = orientationOffsetRef.current;
        
        if (event.absolute || event.alpha !== 0) {
          // heading = 360 - alpha gives clockwise compass reading
          compassHeading = normalizeAngle(360 - event.alpha - screenOffset);
        }
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
