import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0; // KMZ handled by kmz type
  if (hasExtension(intake, 'kml')) return 0.97;
  const head = (intake.textSample || '').slice(0, 400);
  if (/<kml[\s>]/.test(head) || /xmlns\.google\.com\/kml/.test(head)) return 0.95;
  return 0;
}
