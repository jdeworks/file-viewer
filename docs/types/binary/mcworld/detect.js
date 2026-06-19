import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (!intake.bytes || intake.bytes.length < 4) return 0;
  const b = intake.bytes;
  const isPk = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!isPk) return 0;
  if (hasExtension(intake, 'mcworld', 'mctemplate', 'mcpack')) return 0.97;
  const head = intake.textSample || '';
  if (/level\.dat|levelname\.txt|db\/CURRENT|db\/MANIFEST/.test(head)) return 0.85;
  return 0;
}
