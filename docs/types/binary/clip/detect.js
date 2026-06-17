import { hasExtension } from '../../../core/detect.js';

function magic(intake) {
  const b = intake.bytes || new Uint8Array();
  const sig = 'SQLite format 3\0';
  if (b.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig.charCodeAt(i)) return false;
  return true;
}

export function detect(intake) {
  if (!hasExtension(intake, 'clip')) return 0;
  return magic(intake) ? 0.97 : 0.70;
}
