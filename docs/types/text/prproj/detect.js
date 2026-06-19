import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  // .prproj is a gzip-compressed XML file
  if (hasExtension(intake, 'prproj')) {
    if (intake.isBinary) {
      const b = intake.bytes;
      // Check gzip magic bytes: 1f 8b
      if (b && b[0] === 0x1f && b[1] === 0x8b) return 0.98;
      return 0.85;
    }
    // Text might be decompressed version
    const t = intake.textSample || '';
    if (/<PremiereData\b/.test(t) || /<Project\b/.test(t)) return 0.95;
    return 0.7;
  }
  return 0;
}
