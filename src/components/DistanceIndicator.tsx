import { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useMarkerStore } from '@/stores/markerStore';
import { haversineDistance, formatDistance, calculateBearing } from '@/geo';

/**
 * Shows the distance from user's position to the selected marker
 */
export function DistanceIndicator() {
  const { position } = useMapStore();
  const { markers, selectedMarkerId } = useMarkerStore();
  const [distance, setDistance] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  useEffect(() => {
    if (!position || !selectedMarker) {
      setDistance(null);
      setBearing(null);
      return;
    }

    const dist = haversineDistance(
      position.latitude,
      position.longitude,
      selectedMarker.latitude,
      selectedMarker.longitude
    );

    const bear = calculateBearing(
      position.latitude,
      position.longitude,
      selectedMarker.latitude,
      selectedMarker.longitude
    );

    setDistance(dist);
    setBearing(bear);
  }, [position, selectedMarker]);

  if (!selectedMarker || distance === null) return null;

  // Get cardinal direction
  const getDirection = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div className="absolute top-20 left-4 z-10">
      <div className="bg-field-darker/95 backdrop-blur-sm rounded-xl shadow-lg 
                      border border-white/10 p-3 min-w-[160px]">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: selectedMarker.color }}
          />
          <span className="text-white/70 text-sm truncate max-w-[120px]">
            {selectedMarker.name}
          </span>
        </div>
        <div className="text-2xl font-bold text-white">
          {formatDistance(distance)}
        </div>
        {bearing !== null && (
          <div className="flex items-center gap-2 mt-1 text-white/50 text-sm">
            <svg
              className="w-4 h-4"
              style={{ transform: `rotate(${bearing}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            <span>{getDirection(bearing)} ({Math.round(bearing)}°)</span>
          </div>
        )}
      </div>
    </div>
  );
}
