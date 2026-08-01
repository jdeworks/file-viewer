import { hasExtension } from '../../core/detect.js';

// 7z / RAR / tar family archives. These are claimed here at high confidence so they route to
// the archive listing renderer rather than the zip renderer or raw fallback. Zip (.zip) stays
// with the zip type (which has its own JSZip-based reader and central-directory fallback).
export function detect(intake) {
  if (hasExtension(intake, '7z', 'rar', 'tar', 'tgz', 'tbz2', 'txz', 'gz', 'bz2', 'xz', 'zst')) return 0.92;
  // Compound extensions — check the filename directly.
  const name = (intake.filename || '').toLowerCase();
  if (name.endsWith('.tar.gz') || name.endsWith('.tar.bz2') || name.endsWith('.tar.xz') || name.endsWith('.tar.zst')) return 0.92;
  const b = intake.bytes;
  if (b && b.length >= 6) {
    // 7z magic: 37 7A BC AF 27 1C
    if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf) return 0.55;
    // RAR magic: 52 61 72 21 1A 07
    if (b[0] === 0x52 && b[1] === 0x61 && b[2] === 0x72 && b[3] === 0x21) return 0.55;
    if (b[0] === 0x1f && b[1] === 0x8b) return 0.55;
    if (b[0] === 0x42 && b[1] === 0x5a && b[2] === 0x68) return 0.55;
    if (b[0] === 0xfd && b[1] === 0x37 && b[2] === 0x7a && b[3] === 0x58 && b[4] === 0x5a && b[5] === 0x00) return 0.55;
    if (b[0] === 0x28 && b[1] === 0xb5 && b[2] === 0x2f && b[3] === 0xfd) return 0.55;
    // tar magic: 'ustar' at offset 257
    if (b.length >= 262 && b[257] === 0x75 && b[258] === 0x73 && b[259] === 0x74 && b[260] === 0x61 && b[261] === 0x72) return 0.55;
  }
  return 0;
}
