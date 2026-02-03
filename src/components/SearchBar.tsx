import { useState, useRef, useEffect, useMemo } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { useMarkerStore } from '@/stores/markerStore';

interface SearchResult {
  id: string;
  type: 'gps' | 'marker' | 'feature' | 'online';
  name: string;
  description?: string;
  lat: number;
  lon: number;
  icon?: string;
  color?: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { map, position, layers } = useMapStore();
  const { markers } = useMarkerStore();

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Search local markers (offline)
  const markerResults = useMemo((): SearchResult[] => {
    if (query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    return markers
      .filter(m => 
        m.name.toLowerCase().includes(lowerQuery) ||
        m.notes.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        type: 'marker' as const,
        name: m.name,
        description: m.notes || 'Saved marker',
        lat: m.latitude,
        lon: m.longitude,
        icon: m.icon,
        color: m.color,
      }));
  }, [query, markers]);

  // Search KML layer features (offline)
  const featureResults = useMemo((): SearchResult[] => {
    if (query.length < 2) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    layers.forEach((layerData, layerId) => {
      layerData.geojson.features.forEach((feature, index) => {
        const name = feature.properties?.name || '';
        const description = feature.properties?.description || '';
        
        if (name.toLowerCase().includes(lowerQuery) || 
            description.toLowerCase().includes(lowerQuery)) {
          // Get centroid for the feature
          let lat = 0, lon = 0;
          
          if (feature.geometry.type === 'Point') {
            [lon, lat] = feature.geometry.coordinates as [number, number];
          } else if (feature.geometry.type === 'Polygon') {
            // Use first coordinate of polygon
            const coords = feature.geometry.coordinates[0] as [number, number][];
            if (coords.length > 0) {
              [lon, lat] = coords[0];
            }
          } else if (feature.geometry.type === 'LineString') {
            // Use midpoint of line
            const coords = feature.geometry.coordinates as [number, number][];
            const mid = Math.floor(coords.length / 2);
            if (coords[mid]) {
              [lon, lat] = coords[mid];
            }
          }
          
          if (lat && lon) {
            results.push({
              id: `${layerId}-${index}`,
              type: 'feature',
              name: name || 'Unnamed feature',
              description: `${layerData.name}${description ? ' • ' + description : ''}`,
              lat,
              lon,
            });
          }
        }
      });
    });
    
    return results.slice(0, 5);
  }, [query, layers]);

  // Online search (Nominatim) - only when online
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3 || !isOnline) {
      setOnlineResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          {
            headers: {
              'User-Agent': 'ERP-Field-Map/1.0',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          setOnlineResults(data.map((r: any) => ({
            id: `online-${r.place_id}`,
            type: 'online' as const,
            name: r.display_name.split(',')[0],
            description: r.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
          })));
        }
      } catch (error) {
        console.error('Search failed:', error);
        setOnlineResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, isOnline]);

  // Combine all results
  const allResults = useMemo(() => {
    return [...markerResults, ...featureResults, ...onlineResults];
  }, [markerResults, featureResults, onlineResults]);

  // Show dropdown when we have results or GPS option
  useEffect(() => {
    setIsOpen(showSearch && (query.length >= 2 || position !== null));
  }, [showSearch, query, position, allResults]);

  const handleSelect = (result: SearchResult) => {
    if (map) {
      map.flyTo({
        center: [result.lon, result.lat],
        zoom: result.type === 'gps' ? 16 : 14,
        duration: 1500,
      });
    }
    setQuery('');
    setOnlineResults([]);
    setIsOpen(false);
    setShowSearch(false);
  };

  const handleGoToMyLocation = () => {
    if (map && position) {
      map.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 16,
        duration: 1500,
      });
    }
    setQuery('');
    setIsOpen(false);
    setShowSearch(false);
  };

  const handleClose = () => {
    setShowSearch(false);
    setQuery('');
    setOnlineResults([]);
    setIsOpen(false);
  };

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'marker':
        return (
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${result.color}30` }}
          >
            <svg className="w-4 h-4" style={{ color: result.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
        );
      case 'feature':
        return (
          <div className="w-8 h-8 rounded-full bg-field-accent/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-field-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        );
      case 'online':
        return (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Search toggle button */}
      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="absolute top-20 right-4 z-10 w-12 h-12 rounded-full 
                     bg-field-darker/90 backdrop-blur-sm shadow-lg 
                     flex items-center justify-center
                     hover:bg-field-darker transition-colors touch-manipulation active:scale-95"
          title="Search location"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      )}

      {/* Search panel */}
      {showSearch && (
        <div className="absolute top-20 left-4 right-4 z-20 max-w-md mx-auto">
          <div className="bg-field-darker/95 backdrop-blur-sm rounded-xl shadow-2xl 
                          border border-white/10 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-2 p-3 border-b border-white/10">
              <svg
                className={`w-5 h-5 flex-shrink-0 ${isLoading ? 'text-field-accent animate-pulse' : 'text-white/40'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markers, features, or places..."
                className="flex-1 bg-transparent text-white placeholder-white/40 
                         focus:outline-none text-sm"
              />
              {!isOnline && (
                <span className="text-xs text-field-warning px-2 py-0.5 bg-field-warning/20 rounded">
                  Offline
                </span>
              )}
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-white/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {/* GPS Location - always available */}
              {position && (
                <button
                  onClick={handleGoToMyLocation}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 
                           transition-colors text-left border-b border-white/10"
                >
                  <div className="w-8 h-8 rounded-full bg-field-success/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-field-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">My Location</div>
                    <div className="text-field-success text-xs">
                      GPS • {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {/* Local results (markers + features) */}
              {markerResults.length > 0 && (
                <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider bg-white/5">
                  Saved Markers
                </div>
              )}
              {markerResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 
                           transition-colors text-left border-b border-white/5"
                >
                  {getResultIcon(result)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{result.name}</div>
                    <div className="text-white/50 text-xs truncate">{result.description}</div>
                  </div>
                </button>
              ))}

              {featureResults.length > 0 && (
                <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider bg-white/5">
                  Map Features
                </div>
              )}
              {featureResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 
                           transition-colors text-left border-b border-white/5"
                >
                  {getResultIcon(result)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{result.name}</div>
                    <div className="text-white/50 text-xs truncate">{result.description}</div>
                  </div>
                </button>
              ))}

              {/* Online results */}
              {onlineResults.length > 0 && (
                <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider bg-white/5">
                  Online Results
                </div>
              )}
              {onlineResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 
                           transition-colors text-left border-b border-white/5"
                >
                  {getResultIcon(result)}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">{result.name}</div>
                    <div className="text-white/50 text-xs truncate">{result.description}</div>
                  </div>
                </button>
              ))}

              {/* No results message */}
              {query.length >= 2 && allResults.length === 0 && !isLoading && (
                <div className="p-4 text-center text-white/50 text-sm">
                  {isOnline ? 'No locations found' : 'No offline results. Connect to search online.'}
                </div>
              )}

              {/* Hint when empty */}
              {query.length < 2 && !position && (
                <div className="p-4 text-center text-white/50 text-sm">
                  Type to search markers, features, or places
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 text-[10px] text-white/30 text-center border-t border-white/5 flex items-center justify-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-field-success' : 'bg-field-warning'}`} />
              {isOnline ? 'Online search available' : 'Offline mode - local search only'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
