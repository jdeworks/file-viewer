import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  // MDMP magic: 4D 44 4D 50
  if (b[0] === 0x4D && b[1] === 0x44 && b[2] === 0x4D && b[3] === 0x50) return 0.98;
  if (hasExtension(intake, 'dmp') || hasExtension(intake, 'mdmp')) return 0.6;
  return 0;
}
