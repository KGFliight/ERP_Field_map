import { useEffect, useRef, useCallback } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { DevicePosition } from '@/types';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 10000,
};

export function useGeolocation(options: GeolocationOptions = {}) {
  const setPosition = useMapStore((state) => state.setPosition);
  const position = useMapStore((state) => state.position);
  const watchIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const handleSuccess = useCallback(
    (pos: GeolocationPosition) => {
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
    console.error('Geolocation error:', error.message);
    // Don't clear position on error - keep last known position
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    if (isActiveRef.current) return;

    isActiveRef.current = true;
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      mergedOptions
    );
  }, [handleSuccess, handleError, mergedOptions]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
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

  // Start watching on mount
  useEffect(() => {
    startWatching();
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  return {
    position,
    startWatching,
    stopWatching,
    getCurrentPosition,
    isSupported: !!navigator.geolocation,
  };
}
