import { hasExtension } from '../../../core/detect.js';
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'proto')) return 0.96;
  const t = (intake.textSample || '');
  if (t.includes('syntax = "proto') || t.includes("syntax = 'proto")) return 0.7;
  return 0;
}
