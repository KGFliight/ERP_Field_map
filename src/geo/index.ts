/**
 * Geo utilities for ERP Field Map
 * - Haversine distance calculation
 * - Polyline cumulative distance
 * - Geodesic circle generation for range rings
 */

// Earth radius in meters
const EARTH_RADIUS_M = 6371008.8;

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate haversine distance between two points
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Calculate cumulative distance along a polyline
 * @param coordinates Array of [longitude, latitude] pairs
 * @returns Total distance in meters
 */
export function polylineDistance(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return totalDistance;
}

/**
 * Calculate segment distances along a polyline
 * @param coordinates Array of [longitude, latitude] pairs
 * @returns Array of segment distances in meters
 */
export function polylineSegmentDistances(coordinates: [number, number][]): number[] {
  if (coordinates.length < 2) return [];

  const distances: number[] = [];
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1];
    const [lon2, lat2] = coordinates[i];
    distances.push(haversineDistance(lat1, lon1, lat2, lon2));
  }

  return distances;
}

/**
 * Generate a geodesic circle (ring) around a center point
 * @param centerLat Center latitude in degrees
 * @param centerLon Center longitude in degrees
 * @param radiusM Radius in meters
 * @param numPoints Number of points to generate (default 64)
 * @returns Array of [longitude, latitude] pairs forming the circle
 */
export function generateGeodesicCircle(
  centerLat: number,
  centerLon: number,
  radiusM: number,
  numPoints: number = 64
): [number, number][] {
  const coordinates: [number, number][] = [];
  const angularDistance = radiusM / EARTH_RADIUS_M;
  const centerLatRad = toRadians(centerLat);
  const centerLonRad = toRadians(centerLon);

  for (let i = 0; i <= numPoints; i++) {
    const bearing = (2 * Math.PI * i) / numPoints;

    const lat = Math.asin(
      Math.sin(centerLatRad) * Math.cos(angularDistance) +
        Math.cos(centerLatRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );

    const lon =
      centerLonRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatRad),
        Math.cos(angularDistance) - Math.sin(centerLatRad) * Math.sin(lat)
      );

    coordinates.push([toDegrees(lon), toDegrees(lat)]);
  }

  return coordinates;
}

/**
 * Generate GeoJSON for range rings around a point
 * @param centerLat Center latitude in degrees
 * @param centerLon Center longitude in degrees
 * @param radii Array of radii in meters
 * @returns GeoJSON FeatureCollection with ring polygons
 */
export function generateRangeRingsGeoJSON(
  centerLat: number,
  centerLon: number,
  radii: number[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = radii.map((radius) => {
    const coordinates = generateGeodesicCircle(centerLat, centerLon, radius);

    return {
      type: 'Feature',
      properties: {
        radius,
        label: formatDistance(radius),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Generate ring outlines (LineStrings) for better rendering
 * @param centerLat Center latitude in degrees
 * @param centerLon Center longitude in degrees
 * @param radii Array of radii in meters
 * @returns GeoJSON FeatureCollection with ring LineStrings
 */
export function generateRingOutlinesGeoJSON(
  centerLat: number,
  centerLon: number,
  radii: number[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = radii.map((radius) => {
    const coordinates = generateGeodesicCircle(centerLat, centerLon, radius);

    return {
      type: 'Feature',
      properties: {
        radius,
        label: formatDistance(radius),
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Generate ring label points
 * @param centerLat Center latitude in degrees
 * @param centerLon Center longitude in degrees
 * @param radii Array of radii in meters
 * @param bearing Bearing for label placement (default: north/0)
 * @returns GeoJSON FeatureCollection with label points
 */
export function generateRingLabelsGeoJSON(
  centerLat: number,
  centerLon: number,
  radii: number[],
  bearing: number = 0
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = radii.map((radius) => {
    const point = destinationPoint(centerLat, centerLon, radius, bearing);

    return {
      type: 'Feature',
      properties: {
        radius,
        label: formatDistance(radius),
      },
      geometry: {
        type: 'Point',
        coordinates: [point.lon, point.lat],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculate destination point given distance and bearing
 * @param lat Starting latitude in degrees
 * @param lon Starting longitude in degrees
 * @param distance Distance in meters
 * @param bearing Bearing in degrees (0 = north, 90 = east)
 * @returns Destination point {lat, lon}
 */
export function destinationPoint(
  lat: number,
  lon: number,
  distance: number,
  bearing: number
): { lat: number; lon: number } {
  const angularDistance = distance / EARTH_RADIUS_M;
  const bearingRad = toRadians(bearing);
  const latRad = toRadians(lat);
  const lonRad = toRadians(lon);

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const destLonRad =
    lonRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLatRad)
    );

  return {
    lat: toDegrees(destLatRad),
    lon: toDegrees(destLonRad),
  };
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "150 m", "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Calculate bearing from point 1 to point 2
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearing = toDegrees(Math.atan2(y, x));
  return ((bearing % 360) + 360) % 360;
}
