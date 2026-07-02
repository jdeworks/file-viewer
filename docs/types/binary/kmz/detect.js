import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) {
    if (hasExtension(intake, 'kmz')) return 0.6;
    if (mimeMatches(intake, 'google-earth.kmz', 'kmz')) return 0.5;
    return 0;
  }
  const b = intake.bytes;
  if (!(b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04)) return 0;
  if (hasExtension(intake, 'kmz')) return 0.97;
  if (mimeMatches(intake, 'google-earth.kmz', 'kmz')) return 0.9;
  return 0;
}
