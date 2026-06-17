import { hasExtension } from '../../../core/detect.js';
import { parseRom } from './headers.js';

export function detect(intake) {
  const b = intake.bytes || new Uint8Array();
  if (b.length >= 4 && b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a) return 0.99;
  if (b.length >= 0x108 && b[0x104] === 0xce && b[0x105] === 0xed && b[0x106] === 0x66 && b[0x107] === 0x66) return 0.99;
  if (b.length >= 4 && b[0] === 0x80 && b[1] === 0x37 && b[2] === 0x12 && b[3] === 0x40) return 0.99;
  if (b.length >= 4 && b[0] === 0x37 && b[1] === 0x80 && b[2] === 0x40 && b[3] === 0x12) return 0.95;
  if (b.length >= 4 && b[0] === 0x40 && b[1] === 0x12 && b[2] === 0x37 && b[3] === 0x80) return 0.90;
  if (hasExtension(intake, 'sfc', 'smc') && parseRom(b)?.format === 'SNES') return 0.93;
  if (hasExtension(intake, 'gb', 'gbc')) return 0.80;
  return 0;
}
