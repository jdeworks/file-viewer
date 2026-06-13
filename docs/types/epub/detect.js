import { hasExtension } from '../../core/detect.js';

// EPUB e-books. A .epub is a zip, so we must outscore the generic archive type (0.9) on the
// extension. As a fallback, sniff the uncompressed "mimetype" entry that every EPUB stores
// near the start of the archive: the literal bytes "application/epub+zip".
export function detect(intake) {
  if (hasExtension(intake, 'epub')) return 0.96;
  const b = intake.bytes;
  if (b && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b) {
    // PK zip — look for the mimetype marker in the first ~200 bytes.
    const head = b.subarray(0, 200);
    const marker = 'epub+zip';
    outer: for (let i = 0; i + marker.length <= head.length; i++) {
      for (let j = 0; j < marker.length; j++) if (head[i + j] !== marker.charCodeAt(j)) continue outer;
      return 0.95;
    }
  }
  return 0;
}
