import { inspectProtectedData } from './parser.js';

export function detect(intake) {
  if (!intake?.isBinary || !intake.bytes) return 0;
  return inspectProtectedData(intake.bytes) ? 0.995 : 0;
}
