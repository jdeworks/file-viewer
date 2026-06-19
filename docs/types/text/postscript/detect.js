import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'ps', 'eps', 'ai')) return 0.85;
  const head = (intake.textSample || '').slice(0, 120);
  if (/^%!PS(-Adobe)?/.test(head)) return 0.97;
  return 0;
}
