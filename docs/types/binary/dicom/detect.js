import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 132) return 0;
  const b = intake.bytes;
  // DICM magic at offset 128
  if (b[128] === 0x44 && b[129] === 0x49 && b[130] === 0x43 && b[131] === 0x4D) return 0.98;
  if (hasExtension(intake, 'dcm', 'dicom')) return 0.7;
  return 0;
}
