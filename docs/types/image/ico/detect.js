import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 0.99; // ICO magic
  if (b[0] === 0 && b[1] === 0 && b[2] === 2 && b[3] === 0) return 0.99; // CUR magic
  if (hasExtension(intake, 'ico')) return 0.80;
  if (hasExtension(intake, 'cur')) return 0.80;
  return 0;
}
