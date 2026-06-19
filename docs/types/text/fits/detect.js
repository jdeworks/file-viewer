import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (hasExtension(intake, 'fits', 'fit', 'fts')) {
    // FITS header: "SIMPLE  =                    T" in first 30 bytes
    if (intake.isBinary) {
      const head = intake.bytes ? String.fromCharCode(...intake.bytes.slice(0, 30)) : '';
      if (/^SIMPLE\s+=\s+T/.test(head)) return 0.99;
      return 0.8; // extension match, assume FITS
    }
    const head = (intake.text || '').slice(0, 30);
    if (/^SIMPLE\s+=\s+T/.test(head)) return 0.99;
    return 0.8;
  }
  // Content sniff (text only)
  if (!intake.isBinary) {
    const head = (intake.text || '').slice(0, 30);
    if (/^SIMPLE\s+=\s+T/.test(head)) return 0.95;
  }
  return 0;
}
