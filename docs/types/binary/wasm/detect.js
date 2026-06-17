import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 8) return 0;
  // Magic: \0asm
  if (b[0] === 0x00 && b[1] === 0x61 && b[2] === 0x73 && b[3] === 0x6d) return 0.99;
  // Extension fallback
  if (hasExtension(intake, 'wasm')) return 0.5;
  return 0;
}
