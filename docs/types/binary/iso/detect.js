import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (!intake.bytes) return 0;
  const b = intake.bytes;
  if (hasExtension(intake, 'iso', 'img')) {
    // ISO 9660 primary volume descriptor at offset 32769 (sector 16 * 2048 + 1)
    if (b.length > 32774) {
      const magic = String.fromCharCode(b[32769], b[32770], b[32771], b[32772], b[32773]);
      if (magic === 'CD001') return 0.98;
    }
    // For .img files, only if we confirmed CD001
    if (hasExtension(intake, 'iso')) return 0.6;
    return 0;
  }
  // Check for CD001 magic regardless of extension (sector 16)
  if (b.length > 32774) {
    const magic = String.fromCharCode(b[32769], b[32770], b[32771], b[32772], b[32773]);
    if (magic === 'CD001') return 0.95;
  }
  return 0;
}
