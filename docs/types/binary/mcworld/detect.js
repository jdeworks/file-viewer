import { hasExtension, mimeMatches } from '../../../core/detect.js';

export function detect(intake) {
  const hasMcExt = hasExtension(intake, 'mcworld', 'mctemplate', 'mcpack');
  if (!intake.bytes || intake.bytes.length < 4) {
    if (hasMcExt) return 0.6;
    if (mimeMatches(intake, 'mcworld', 'mcpack', 'minecraft')) return 0.5;
    return 0;
  }
  const b = intake.bytes;
  const isPk = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  if (!isPk) return 0;
  if (hasMcExt) return 0.97;
  if (mimeMatches(intake, 'mcworld', 'mcpack', 'minecraft')) return 0.9;
  const head = intake.textSample || '';
  if (/level\.dat|levelname\.txt|db\/CURRENT|db\/MANIFEST/.test(head)) return 0.85;
  return 0;
}
