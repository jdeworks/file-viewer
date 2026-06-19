import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const b = intake.bytes;
  if (b?.length >= 4) {
    const le = b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00;
    const be = b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a;
    const big = (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2b && b[3] === 0x00)
      || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2b);
    if (le || be || big) return 0.99;
  }
  if (hasExtension(intake, 'tif', 'tiff')) return 0.9;
  return 0;
}
