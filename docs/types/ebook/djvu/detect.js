import { hasExtension } from '../../../core/detect.js';

// DjVu documents. Magic: AT&TFORM at offset 0, then 4-byte length, then DJVU/DJVM/DJVI/THUM at offset 12.
// AT&T = 0x41 0x54 0x26 0x54 (note: AT&T in ASCII = 41 54 26 54, not AT& T)
// Wait — "AT&T" is: A=0x41 T=0x54 &=0x26 T=0x54
// then "FORM" = 0x46 0x4F 0x52 0x4D
export function detect(intake) {
  const b = intake.bytes;
  if (b && b.length >= 16) {
    // Check AT&TFORM magic (bytes 0-7)
    if (b[0] === 0x41 && b[1] === 0x54 && b[2] === 0x26 && b[3] === 0x54 &&
        b[4] === 0x46 && b[5] === 0x4F && b[6] === 0x52 && b[7] === 0x4D) {
      // Subtype at offset 12 (after 4-byte size field)
      const sub = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (sub === 'DJVU' || sub === 'DJVM' || sub === 'DJVI' || sub === 'THUM') return 0.99;
      return 0.85; // IFF FORM but unknown subtype
    }
  }
  if (hasExtension(intake, 'djvu', 'djv')) return 0.7;
  return 0;
}
