import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 12) return 0;
  const b = intake.bytes;
  const magic = String.fromCharCode(b[0], b[1], b[2], b[3]);
  if (magic === 'IWAD' || magic === 'PWAD') return 0.98;
  if (hasExtension(intake, 'wad')) return 0.6;
  return 0;
}
