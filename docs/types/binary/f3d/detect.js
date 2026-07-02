import { hasExtension, mimeMatches } from '../../../core/detect.js';

// Fusion 360 .f3d: ZIP file (PK magic) with specific internal structure
// Also .f3z (assembly) shares the same format

export function detect(intake) {
  const { bytes: b } = intake;
  const isF3dExt = hasExtension(intake, 'f3d', 'f3z');
  const isF3dMime = mimeMatches(intake, 'fusion360', 'x-fusion360', 'vnd.autodesk');

  if (!b || b.length < 4) return isF3dExt || isF3dMime ? 0.55 : 0;

  const isPkZip = b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07);
  if (isF3dExt || isF3dMime) return isPkZip ? 0.97 : 0.4;
  return 0;
}
