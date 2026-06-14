import { hasExtension } from '../../../core/detect.js';

// Wavefront OBJ 3D models. Extension is the signal; a content sniff (vertex + face lines) is a
// fallback. (.obj has no magic and the extension collides with nothing else here.)
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'obj')) return 0.9;
  const t = intake.textSample || '';
  if (/^v\s+-?\d/m.test(t) && /^f\s+\d/m.test(t)) return 0.55;
  return 0;
}
