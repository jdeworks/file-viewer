import { hasExtension, mimeMatches } from '../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'html', 'htm', 'xhtml')) return 0.96;
  if (mimeMatches(intake, 'text/html')) return 0.9;
  const t = (intake.textSample || '').trim().toLowerCase();
  if (t.startsWith('<!doctype html') || t.startsWith('<html')) return 0.85;
  return 0;
}
