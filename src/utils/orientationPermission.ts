/** True when the browser exposes DeviceOrientationEvent.requestPermission (e.g. iOS Safari). */
export function orientationRequiresExplicitPermission(): boolean {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return false;
  }
  const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  return typeof DOE.requestPermission === 'function';
}

/**
 * Compass / motion permission only matters on devices that plausibly have a magnetometer
 * and are not typical mouse-only desktops. Some desktop Chromium builds still expose
 * requestPermission even though there is no useful compass — GPS alone is enough there.
 */
export function compassRelevantForPermissions(): boolean {
  if (!orientationRequiresExplicitPermission()) return false;
  if (typeof window === 'undefined') return false;
  const likelyDesktopMouseOnly =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    navigator.maxTouchPoints === 0;
  return !likelyDesktopMouseOnly;
}
