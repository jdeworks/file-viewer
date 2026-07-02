import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  const isDicomName = hasExtension(intake, 'dcm', 'dicom');
  const isDicomMime = mimeMatches(intake, 'dicom');
  if (!intake.bytes || intake.bytes.length < 132) return isDicomName || isDicomMime ? 0.55 : 0;
  const b = intake.bytes;
  // DICM magic at offset 128
  if (b[128] === 0x44 && b[129] === 0x49 && b[130] === 0x43 && b[131] === 0x4D) {
    return isDicomName ? 0.99 : isDicomMime ? 0.98 : 0.96;
  }
  if (isDicomName || isDicomMime) return 0.7;
  return 0;
}
