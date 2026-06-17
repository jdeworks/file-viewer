import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  const b = intake.bytes || new Uint8Array();
  if (b.length >= 4 && b[0] === 0x4d && b[1] === 0x54 && b[2] === 0x68 && b[3] === 0x64) return 0.99;
  if (/^(audio\/(?:x-)?midi|audio\/mid|audio\/sp-midi|application\/x-midi)$/i.test(intake.mimeType || '')) return 0.96;
  if (hasExtension(intake, 'mid', 'midi')) return 0.80;
  return 0;
}
