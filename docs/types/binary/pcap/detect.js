import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  // PCAP classic: LE or BE magic
  if ((b[0] === 0xd4 && b[1] === 0xc3 && b[2] === 0xb2 && b[3] === 0xa1) ||
      (b[0] === 0xa1 && b[1] === 0xb2 && b[2] === 0xc3 && b[3] === 0xd4) ||
      // nanosecond variants
      (b[0] === 0x4d && b[1] === 0x3c && b[2] === 0xb2 && b[3] === 0xa1) ||
      (b[0] === 0xa1 && b[1] === 0xb2 && b[2] === 0x3c && b[3] === 0x4d)) {
    return 0.98;
  }
  // PCAPNG: section header block magic
  if (b[0] === 0x0a && b[1] === 0x0d && b[2] === 0x0d && b[3] === 0x0a) return 0.98;
  if (hasExtension(intake, 'pcap', 'pcapng', 'cap')) return 0.7;
  return 0;
}
