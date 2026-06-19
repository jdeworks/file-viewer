import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'ofx', 'qfx', 'ofc')) return 0.92;
  const head = (intake.text || '').slice(0, 500);
  if (/OFXHEADER:/i.test(head) || /<OFX[\s>]/i.test(head) || /<\?OFX/i.test(head)) return 0.7;
  return 0;
}
