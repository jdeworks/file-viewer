import { hasExtension } from '../../../core/detect.js';

function hasSqliteMagic(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) return false;
  const sig = 'SQLite format 3\0';
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig.charCodeAt(i)) return false;
  return true;
}

export function detect(intake) {
  if (!hasSqliteMagic(intake)) return 0;
  if (hasExtension(intake, 'mbtiles')) return 0.97;
  return 0;
}
