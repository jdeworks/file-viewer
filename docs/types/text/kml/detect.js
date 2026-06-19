import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) {
    // KMZ is a ZIP — handle by zip type; signal no detection here
    if (hasExtension(intake, 'kmz')) return 0.1; // low score, zip type handles it
    return 0;
  }
  if (hasExtension(intake, 'kml')) return 0.97;
  const head = (intake.textSample || '').slice(0, 400);
  if (/<kml[\s>]/.test(head) || /xmlns\.google\.com\/kml/.test(head)) return 0.95;
  return 0;
}
