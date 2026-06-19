import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'geojson', 'topojson')) return 0.85;
  const head = (intake.textSample || '').slice(0, 300).trim();
  if (/"type"\s*:\s*"FeatureCollection"/.test(head)) return 0.97;
  if (/"type"\s*:\s*"Topology"/.test(head)) return 0.97;
  if (/"type"\s*:\s*"Feature"/.test(head) && /"geometry"/.test(head)) return 0.93;
  return 0;
}
