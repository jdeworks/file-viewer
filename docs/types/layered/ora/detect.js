import { hasExtension } from '../../../core/detect.js';

// ORA (OpenRaster) detection.
// ORA files are ZIP archives (PK magic) with a `mimetype` entry = "image/openraster".
// We detect via ZIP magic bytes + .ora extension; the full mimetype check requires
// reading the archive and is deferred to the renderer.
export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 4) return 0;
  // Must be a ZIP (PK local-file header magic)
  if (b[0] !== 0x50 || b[1] !== 0x4b || b[2] !== 0x03 || b[3] !== 0x04) return 0;
  if (hasExtension(intake, 'ora')) return 0.95;
  return 0;
}
