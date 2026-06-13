import { hasExtension } from '../../core/detect.js';

// Font files. By extension, plus magic-number sniff: wOFF / wOF2 / 0x00010000 (TrueType) / OTTO.
export function detect(intake) {
  if (hasExtension(intake, 'ttf', 'otf', 'woff', 'woff2')) return 0.95;
  const b = intake.bytes;
  if (b && b.length >= 4) {
    const sig = String.fromCharCode(b[0], b[1], b[2], b[3]);
    if (sig === 'wOFF' || sig === 'wOF2' || sig === 'OTTO' || sig === 'true' || sig === 'ttcf') return 0.85;
    if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return 0.6;   // TTF (also some other formats)
  }
  return 0;
}
