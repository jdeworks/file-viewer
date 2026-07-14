import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'json', 'jsonc', 'geojson', 'json5', 'lot')) return 0.96;
  if (mimeMatches(intake, 'video/lottie+json')) return 0.97;
  if (mimeMatches(intake, 'json')) return 0.9;
  // Content: starts like JSON (cheap — no full parse in the detector).
  const t = (intake.textSample || '').trim();
  if ((t.startsWith('{') && t.includes('"')) || t.startsWith('[')) return 0.5;
  return 0;
}
