import { hasExtension } from '../../core/detect.js';

// GeoJSON / GPX geospatial files → SVG map. Strong on .geojson/.gpx; a content sniff catches
// GPX-in-.xml and GeoJSON FeatureCollections. (Plain .json GeoJSON stays with the JSON tree
// viewer unless it carries the .geojson extension — the user can switch types.)
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'geojson', 'gpx')) return 0.97;   // beat the JSON viewer for .geojson
  const t = intake.textSample || '';
  if (/<gpx[\s>]/.test(t)) return 0.85;
  if (/"type"\s*:\s*"(FeatureCollection|Feature)"/.test(t) && /"coordinates"/.test(t)) return 0.55;
  return 0;
}
