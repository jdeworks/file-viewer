import { hasExtension } from '../../core/detect.js';

// ORA = ZIP with mimetype=image/openraster; PSD = 8BPS magic.
export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;
  // PSD magic: 8BPS
  if (b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53) return 0.97;
  // ORA = ZIP (PK magic) + .ora extension
  if (b[0] === 0x50 && b[1] === 0x4b && hasExtension(intake, 'ora')) return 0.95;
  return 0;
}
