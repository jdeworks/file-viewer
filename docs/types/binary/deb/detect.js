import { hasExtension, mimeMatches } from '../../../core/detect.js';

// Debian .deb: ar archive magic "!<arch>\n" followed by debian-binary member

export function detect(intake) {
  const { bytes: b } = intake;
  const isDebExt = hasExtension(intake, 'deb', 'udeb');
  const isDebMime = mimeMatches(intake, 'debian.binary-package', 'x-debian-package', 'vnd.debian');

  if (!b || b.length < 8) return isDebExt || isDebMime ? 0.5 : 0;

  // ar magic: "!<arch>\n" = 21 3C 61 72 63 68 3E 0A
  const isArMagic = b[0] === 0x21 && b[1] === 0x3c && b[2] === 0x61 && b[3] === 0x72
    && b[4] === 0x63 && b[5] === 0x68 && b[6] === 0x3e && b[7] === 0x0a;

  if (!isArMagic) return isDebExt || isDebMime ? 0.3 : 0;

  // Look for "debian-binary" in the first entry name (at offset 8).
  if (b.length >= 24) {
    const name = new TextDecoder('ascii', { fatal: false }).decode(b.slice(8, 24)).trimEnd();
    if (name.startsWith('debian-binary')) return isDebExt ? 0.99 : isDebMime ? 0.98 : 0.97;
  }
  return isDebExt ? 0.55 : isDebMime ? 0.5 : 0.05;
}
