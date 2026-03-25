import { useEffect, useState } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useMarkerStore } from '@/stores/markerStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { haversineDistance, formatDistance, calculateBearing } from '@/geo';

/**
 * Shows the distance from user's position to the selected marker
 */
export function DistanceIndicator() {
  const { position } = useMapStore();
  const { markers, selectedMarkerId, setEditingMarker, selectMarker } = useMarkerStore();
  const { isTrainingMode } = useTrainingStore();
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

  const handleEdit = () => {
    setEditingMarker(selectedMarker);
  };

  const handleClose = () => {
    selectMarker(null);
  };

  // Position: top-center when in training mode, otherwise top-left but offset from training controls
  const positionClass = isTrainingMode 
    ? 'top-20 left-1/2 -translate-x-1/2' 
    : 'top-20 left-4';

  return (
    <div className={`absolute ${positionClass} z-10`}>
      <div className="bg-field-darker/95 backdrop-blur-sm rounded-lg shadow-lg 
                      border border-white/10 overflow-hidden">
        {/* Header row with name and actions */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedMarker.color }}
          />
          <span className="text-white text-sm font-medium truncate max-w-[100px]">
            {selectedMarker.name}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleEdit}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Edit marker"
            >
              <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Close"
            >
              <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Stats row */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="text-lg font-bold text-white">
            {formatDistance(distance)}
          </div>
          {bearing !== null && (
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <svg
                className="w-3 h-3"
                style={{ transform: `rotate(${bearing}deg)` }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>{getDirection(bearing)} ({Math.round(bearing)}°)</span>
            </div>
          )}
        </div>

        {/* Notes preview if available */}
        {selectedMarker.notes && (
          <div className="px-3 pb-2">
            <p className="text-white/50 text-xs truncate max-w-[180px]">
              {selectedMarker.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
