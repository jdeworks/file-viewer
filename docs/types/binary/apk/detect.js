import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  const isPk = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!isPk) return 0;
  if (hasExtension(intake, 'apk', 'aab', 'xapk')) return 0.97;
  // Sniff for APK-specific files in text sample
  const head = intake.textSample || '';
  if (/AndroidManifest\.xml|classes\.dex|META-INF\//.test(head)) return 0.9;
  return 0;
}
