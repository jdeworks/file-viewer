import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (intake.isBinary) return 0;
  // .topojson is not handled by geoType — own it
  if (hasExtension(intake, 'topojson')) return 0.92;
  // .geojson is handled by geoType (id:'geo') which returns 0.97 for the extension.
  // Return a LOWER score so geoType wins for .geojson but we appear as an alternative.
  if (hasExtension(intake, 'geojson')) return 0.50;
  const head = (intake.textSample || '').slice(0, 300).trim();
  if (/"type"\s*:\s*"Topology"/.test(head)) return 0.95;
  if (/"type"\s*:\s*"FeatureCollection"/.test(head) && /"features"/.test(head)) return 0.30;
  return 0;
}
