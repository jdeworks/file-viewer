import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'abc')) {
    const t = intake.textSample || '';
    // ABC notation starts with X: (index) and T: (title) fields
    if (/^X:\s*\d/m.test(t) || /^T:\s*\S/m.test(t)) return 0.97;
    return 0.75;
  }
  // Content sniff for ABC embedded in .txt or unknown
  const t = intake.textSample || '';
  if (/^X:\s*\d/m.test(t) && /^T:\s*\S/m.test(t) && /^K:\s*\w/m.test(t)) return 0.8;
  return 0;
}
