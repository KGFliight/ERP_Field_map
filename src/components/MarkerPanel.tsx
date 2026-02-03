import { useState } from 'react';
import { useMarkerStore } from '@/stores/markerStore';
import { useMapStore } from '@/stores/mapStore';
import { haversineDistance, formatDistance } from '@/geo';
import type { StoredMarker } from '@/types';

function MarkerIcon({ icon, color }: { icon: string; color: string }) {
  const iconPaths: Record<string, string> = {
    pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    flag: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
    star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    camp: 'M5 12h14M5 12l-2 8h18l-2-8M5 12l7-8 7 8',
    water: 'M12 22c4.97 0 9-3.582 9-8 0-4.418-9-14-9-14S3 9.582 3 14c0 4.418 4.03 8 9 8z',
    vehicle: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  };

  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[icon] || iconPaths.pin} />
    </svg>
  );
}

function MarkerListItem({
  marker,
  isSelected,
  distance,
  onSelect,
  onEdit,
  onFlyTo,
}: {
  marker: StoredMarker;
  isSelected: boolean;
  distance: number | null;
  onSelect: () => void;
  onEdit: () => void;
  onFlyTo: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors touch-manipulation
        ${isSelected ? 'bg-field-accent/20 border border-field-accent/30' : 'hover:bg-white/5'}`}
      onClick={onSelect}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${marker.color}20` }}
      >
        <MarkerIcon icon={marker.icon} color={marker.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{marker.name}</div>
        {marker.notes && (
          <div className="text-white/50 text-sm truncate">{marker.notes}</div>
        )}
        {distance !== null && (
          <div className="text-field-accent text-sm font-medium">
            {formatDistance(distance)} away
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlyTo();
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Fly to marker"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Edit marker"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function MarkerPanel() {
  const {
    markers,
    selectedMarkerId,
    showMarkerPanel,
    setShowMarkerPanel,
    selectMarker,
    setEditingMarker,
  } = useMarkerStore();
  const { map, position } = useMapStore();
  const [searchQuery, setSearchQuery] = useState('');

  if (!showMarkerPanel) return null;

  // Filter markers by search
  const filteredMarkers = markers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate distances from user
  const getDistance = (marker: StoredMarker): number | null => {
    if (!position) return null;
    return haversineDistance(
      position.latitude,
      position.longitude,
      marker.latitude,
      marker.longitude
    );
  };

  // Sort by distance if position available
  const sortedMarkers = [...filteredMarkers].sort((a, b) => {
    const distA = getDistance(a);
    const distB = getDistance(b);
    if (distA === null && distB === null) return 0;
    if (distA === null) return 1;
    if (distB === null) return -1;
    return distA - distB;
  });

  const handleFlyTo = (marker: StoredMarker) => {
    if (map) {
      map.flyTo({
        center: [marker.longitude, marker.latitude],
        zoom: 16,
        duration: 1000,
      });
    }
    selectMarker(marker.id);
    setShowMarkerPanel(false);
  };

  const handleEdit = (marker: StoredMarker) => {
    setEditingMarker(marker);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30"
        onClick={() => setShowMarkerPanel(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-field-darker rounded-t-2xl 
                      shadow-2xl max-h-[70vh] overflow-hidden animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Markers ({markers.length})</h2>
          <button
            onClick={() => setShowMarkerPanel(false)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search markers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 rounded-lg text-white placeholder-white/40
                       focus:outline-none focus:ring-2 focus:ring-field-accent/50"
            />
          </div>
        </div>

        {/* Marker list */}
        <div className="overflow-y-auto max-h-[calc(70vh-140px)]">
          {sortedMarkers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <p className="text-white/50">
                {searchQuery ? 'No markers found' : 'No markers yet'}
              </p>
              <p className="text-white/30 text-sm mt-1">
                {!searchQuery && 'Tap the + button to drop a pin'}
              </p>
            </div>
          ) : (
            <div className="p-2">
              {sortedMarkers.map((marker) => (
                <MarkerListItem
                  key={marker.id}
                  marker={marker}
                  isSelected={marker.id === selectedMarkerId}
                  distance={getDistance(marker)}
                  onSelect={() => selectMarker(marker.id)}
                  onEdit={() => handleEdit(marker)}
                  onFlyTo={() => handleFlyTo(marker)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
