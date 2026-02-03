import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import type { DevicePosition } from '@/types';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0, // Always get fresh position
  timeout: 15000, // 15 second timeout
};

export function useGeolocation(options: GeolocationOptions = {}) {
  const setPosition = useMapStore((state) => state.setPosition);
  const position = useMapStore((state) => state.position);
  const watchIdRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  // Memoize options to prevent recreation on every render
  const mergedOptions = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    [options.enableHighAccuracy, options.maximumAge, options.timeout]
  );

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
    console.error('Geolocation error:', error.message, error.code);
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

  // Start watching on mount - only once
  useEffect(() => {
    startWatching();
    
    // Handle visibility change - restart GPS when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible - ensure GPS is watching
        if (watchIdRef.current === null) {
          startWatching();
        }
        // Also request an immediate position update
        getCurrentPosition();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopWatching();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startWatching, stopWatching, getCurrentPosition]);

  return {
    position,
    startWatching,
    stopWatching,
    getCurrentPosition,
    isSupported: !!navigator.geolocation,
  };
}
