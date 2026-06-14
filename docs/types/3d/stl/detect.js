import { hasExtension } from '../../../core/detect.js';

// STL 3D models (binary or ASCII). Extension is the strong signal (binary STL has no reliable
// magic); an ASCII "solid … facet" sniff is a fallback.
export function detect(intake) {
  if (hasExtension(intake, 'stl')) return 0.95;
  const t = intake.textSample || '';
  if (/^\s*solid\b/i.test(t) && /facet\s+normal/i.test(t)) return 0.6;
  return 0;
}
