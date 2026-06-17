import { hasExtension } from '../../../core/detect.js';

const hasZipMagic = (b) => b && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

export function detect(intake) {
  const b = intake.bytes || new Uint8Array();
  if (!hasZipMagic(b)) return 0;
  const sample = new TextDecoder('latin1').decode(b.subarray(0, Math.min(b.length, 32768)));
  if (sample.includes('[Content_Types].xml') && /model\/3mf/i.test(sample)) return 0.99;
  if (hasExtension(intake, '3mf')) return 0.97;
  return 0;
}
