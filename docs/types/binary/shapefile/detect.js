import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  // Shapefile magic: file code 9994 = 0x0000270A (big-endian int32)
  if (b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x27 && b[3] === 0x0A) {
    if (hasExtension(intake, 'shp')) return 0.99;
    return 0.85;
  }
  if (hasExtension(intake, 'shp')) return 0.5;
  return 0;
}
