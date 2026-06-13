import { hasExtension } from '../../core/detect.js';

// MOBI / AZW (Kindle / Mobipocket). Claim the extensions, and the PalmDB type/creator signature
// 'BOOKMOBI' (at offset 60) as a strong content signal for mis-named files.
export function detect(intake) {
  if (hasExtension(intake, 'mobi', 'azw', 'azw3', 'prc')) return 0.95;
  const b = intake.bytes;
  if (b && b.length >= 68) {
    let sig = '';
    for (let i = 60; i < 68; i++) sig += String.fromCharCode(b[i]);
    if (sig === 'BOOKMOBI' || sig === 'TEXtREAd') return 0.6;
  }
  return 0;
}
