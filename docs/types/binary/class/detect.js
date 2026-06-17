import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;
  const hasMagic =
    b[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe;
  const hasExt = hasExtension(intake, 'class');
  if (hasMagic) return 0.97;
  if (hasExt) return 0.6;
  return 0;
}
