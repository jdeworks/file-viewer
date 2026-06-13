import { hasExtension } from '../../core/detect.js';

// PLY 3D models (ASCII or binary). Extension is the signal; the magic first line is "ply".
export function detect(intake) {
  if (hasExtension(intake, 'ply')) return 0.95;
  const b = intake.bytes;
  if (b && b.length >= 3 && b[0] === 0x70 && b[1] === 0x6c && b[2] === 0x79) return 0.85;   // 'ply'
  return 0;
}
