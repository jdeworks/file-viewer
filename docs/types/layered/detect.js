import { hasExtension } from '../../core/detect.js';

// PSD = 8BPS magic; XCF = "gimp xcf " magic; ORA/KRA = ZIP (PK) + extension.
export function detect(intake) {
  if (!intake.isBinary) return 0;
  const b = intake.bytes;
  if (!b || b.length < 9) return 0;
  // PSD magic: 8BPS
  if (b[0] === 0x38 && b[1] === 0x42 && b[2] === 0x50 && b[3] === 0x53) return 0.97;
  // XCF magic: "gimp xcf "
  if (b[0] === 0x67 && b[1] === 0x69 && b[2] === 0x6d && b[3] === 0x70 &&
      b[4] === 0x20 && b[5] === 0x78 && b[6] === 0x63 && b[7] === 0x66 &&
      b[8] === 0x20) return 0.99;
  // ZIP-based formats by extension
  if (b[0] === 0x50 && b[1] === 0x4b) {
    if (hasExtension(intake, 'ora')) return 0.95;
    if (hasExtension(intake, 'kra')) return 0.97;
  }
  return 0;
}
