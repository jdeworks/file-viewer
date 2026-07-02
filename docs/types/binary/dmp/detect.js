import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  const isDmpName = hasExtension(intake, 'dmp', 'mdmp');
  const isDmpMime = mimeMatches(intake, 'x-dmp', 'minidump');
  if (!intake.bytes || intake.bytes.length < 4) return isDmpName || isDmpMime ? 0.55 : 0;
  const b = intake.bytes;
  // MDMP magic: 4D 44 4D 50
  if (b[0] === 0x4D && b[1] === 0x44 && b[2] === 0x4D && b[3] === 0x50) {
    return isDmpName ? 0.99 : isDmpMime ? 0.98 : 0.96;
  }
  if (isDmpName || isDmpMime) return 0.6;
  return 0;
}
