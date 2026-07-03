import { hasExtension } from '../../../core/detect.js';

// The generic image type (../detect.js) also scores plain `.ico` extension at
// 0.95 (its own byte-signature checks don't recognise ICO, so a truncated/odd
// file falls through to its extension fallback). Our own extension-only score
// must beat that or a malformed .ico loses its dedicated multi-resolution
// viewer to the generic renderer — same fix pattern as svg/detect.js.
export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 0.99; // ICO magic
  if (b[0] === 0 && b[1] === 0 && b[2] === 2 && b[3] === 0) return 0.99; // CUR magic
  if (hasExtension(intake, 'ico')) return 0.96;
  if (hasExtension(intake, 'cur')) return 0.80;
  return 0;
}
