import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const isAls = hasExtension(intake, 'als');
  if (!isAls) return 0;
  const b = intake.bytes || new Uint8Array();
  if (b.length >= 2 && b[0] === 0x1f && b[1] === 0x8b) return 0.97;
  return 0.90;
}
