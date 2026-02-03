import { kml } from '@tmcw/togeojson';
import type { FeatureCollection, Feature, Geometry } from 'geojson';

/**
 * Parse KML string to GeoJSON FeatureCollection
 */
export function parseKML(kmlString: string): FeatureCollection {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, 'application/xml');

  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`KML parsing error: ${parseError.textContent}`);
  }

  // Use togeojson to convert KML to GeoJSON
  const geojson = kml(doc);

  // Ensure we have a valid FeatureCollection
  if (!geojson || geojson.type !== 'FeatureCollection') {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  // Clean up and normalize features
  const cleanedFeatures = geojson.features
    .filter((f): f is Feature<Geometry> => f.geometry !== null)
    .map((feature) => normalizeFeature(feature));

  return {
    type: 'FeatureCollection',
    features: cleanedFeatures,
  };
}

/**
 * Normalize a GeoJSON feature for consistent handling
 */
function normalizeFeature(feature: Feature<Geometry>): Feature<Geometry> {
  const properties = feature.properties || {};

  // Extract common KML fields
  const name =
    properties.name || properties.Name || properties.NAME || 'Unnamed';
  const description =
    properties.description ||
    properties.Description ||
    properties.DESCRIPTION ||
    '';

  // Clean HTML from description if present
  const cleanDescription = cleanHtmlDescription(description);

  return {
    ...feature,
    properties: {
      ...properties,
      name,
      description: cleanDescription,
      // Preserve original name/description if different
      _originalName: properties.name,
      _originalDescription: properties.description,
    },
  };
}

/**
 * Clean HTML from KML description fields
 * Preserves basic text content while removing dangerous elements
 */
function cleanHtmlDescription(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // If it doesn't look like HTML, return as-is
  if (!html.includes('<')) return html.trim();

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements
    doc.querySelectorAll('script, style').forEach((el) => el.remove());

    // Get text content
    const text = doc.body.textContent || '';

    // Clean up whitespace
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    // If parsing fails, return original with basic tag stripping
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Fetch and parse KML from URL
 */
export async function fetchAndParseKML(url: string): Promise<FeatureCollection> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch KML: ${response.status} ${response.statusText}`);
  }

  const kmlText = await response.text();
  return parseKML(kmlText);
}

/**
 * Get feature bounds from a FeatureCollection
 */
export function getFeatureBounds(
  geojson: FeatureCollection
): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function processCoords(coords: number[] | number[][] | number[][][]): void {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords as number[];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    } else {
      (coords as (number[] | number[][])[]).forEach(processCoords);
    }
  }

  geojson.features.forEach((feature) => {
    if (feature.geometry && 'coordinates' in feature.geometry) {
      processCoords(feature.geometry.coordinates as number[] | number[][] | number[][][]);
    }
  });

  if (!isFinite(minLng)) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
