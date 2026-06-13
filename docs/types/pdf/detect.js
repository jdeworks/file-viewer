import { hasExtension, mimeMatches } from '../../core/detect.js';

// PDFs are binary; detect by magic bytes "%PDF", extension, or MIME.
export function detect(intake) {
  const b = intake.bytes;
  if (b && b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 0.99;
  if (hasExtension(intake, 'pdf')) return 0.95;
  if (mimeMatches(intake, 'pdf')) return 0.9;
  return 0;
}
