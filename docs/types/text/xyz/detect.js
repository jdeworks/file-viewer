import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (!hasExtension(intake, 'xyz')) return 0;
  const lines = (intake.textSample || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return 0.5;
  // First line should be an integer (atom count)
  if (/^\d+$/.test(lines[0])) return 0.93;
  return 0.4;
}
