import { hasExtension } from '../../core/detect.js';

// SQLite database files. By extension, or the 16-byte magic header "SQLite format 3\0".
export function detect(intake) {
  if (hasExtension(intake, 'sqlite', 'sqlite3', 'db', 'db3', 's3db', 'sl3', 'gpkg')) {
    return magic(intake) ? 0.97 : 0.8;   // extension + magic = very confident
  }
  return magic(intake) ? 0.9 : 0;
}

function magic(intake) {
  const b = intake.bytes;
  if (!b || b.length < 16) return false;
  const sig = 'SQLite format 3\0';
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig.charCodeAt(i)) return false;
  return true;
}
