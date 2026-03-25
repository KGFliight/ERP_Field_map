import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { DevicePosition } from '@/types';

export type GeolocationPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  /** When true, no watch/getCurrentPosition runs (e.g. during onboarding). */
  paused?: boolean;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000, // Allow 1 second cache for faster initial position
  timeout: 30000, // 30 second timeout (iOS can be slow to get GPS lock)
};

export function useGeolocation(options: GeolocationOptions = {}) {
  const { paused = false, enableHighAccuracy, maximumAge, timeout } = options;
  const setPosition = useMapStore((state) => state.setPosition);
  const position = useMapStore((state) => state.position);
  const watchIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const [geolocationPermission, setGeolocationPermission] =
    useState<GeolocationPermissionState>(() =>
      typeof navigator !== 'undefined' && navigator.geolocation
        ? 'prompt'
        : 'unsupported'
    );

  // Memoize options to prevent recreation on every render
  const mergedOptions = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...(enableHighAccuracy !== undefined && { enableHighAccuracy }),
      ...(maximumAge !== undefined && { maximumAge }),
      ...(timeout !== undefined && { timeout }),
    }),
    [enableHighAccuracy, maximumAge, timeout]
  );

  const handleSuccess = useCallback(
    (pos: GeolocationPosition) => {
      setGeolocationPermission((s) => (s === 'granted' ? s : 'granted'));
      const devicePosition: DevicePosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        altitudeAccuracy: pos.coords.altitudeAccuracy,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      };
      setPosition(devicePosition);
    },
    [setPosition]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    console.error('Geolocation error:', error.message, error.code);
    if (error.code === error.PERMISSION_DENIED) {
      setGeolocationPermission('denied');
    }
    // Don't clear position on error - keep last known position
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // If already watching, don't start again
    if (watchIdRef.current !== null) return;

    isActiveRef.current = true;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      mergedOptions
    );
    
    console.log('Started GPS watching, watchId:', watchIdRef.current);
  }, [handleSuccess, handleError, mergedOptions]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('Stopping GPS watching, watchId:', watchIdRef.current);
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isActiveRef.current = false;
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      mergedOptions
    );
  }, [handleSuccess, handleError, mergedOptions]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    let perm: PermissionStatus | undefined;
    let cancelled = false;

    const mapState = (s: PermissionState): GeolocationPermissionState =>
      s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';

    void navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        if (cancelled) return;
        perm = p;
        setGeolocationPermission(mapState(p.state));
        p.onchange = () => setGeolocationPermission(mapState(p.state));
      })
      .catch(() => {
        /* Permissions API unsupported for geolocation */
      });

    return () => {
      cancelled = true;
      if (perm) perm.onchange = null;
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || paused) return;
      if (watchIdRef.current === null) {
        startWatching();
      }
      getCurrentPosition();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (paused) {
      stopWatching();
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    startWatching();

    return () => {
      stopWatching();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [paused, startWatching, stopWatching, getCurrentPosition]);

  return {
    position,
    startWatching,
    stopWatching,
    getCurrentPosition,
    isSupported: !!navigator.geolocation,
    geolocationPermission,
  };
}
