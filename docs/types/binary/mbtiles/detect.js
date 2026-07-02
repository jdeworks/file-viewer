import { hasExtension, mimeMatches } from '../../../core/detect.js';

function hasSqliteMagic(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) return false;
  const sig = 'SQLite format 3\0';
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig.charCodeAt(i)) return false;
  return true;
}

export function detect(intake) {
  const isMbtiles = hasExtension(intake, 'mbtiles');
  if (!hasSqliteMagic(intake)) {
    if (isMbtiles) return 0.6;
    if (mimeMatches(intake, 'sqlite', 'x-sqlite')) return 0.25;
    return 0;
  }
  if (isMbtiles) return 0.97;
  if (mimeMatches(intake, 'sqlite', 'x-sqlite')) return 0.45;
  return 0;
}
