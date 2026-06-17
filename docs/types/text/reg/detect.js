import { isBinary } from '../../../core/detect.js';

export function detect(intake) {
  if (isBinary(intake)) return 0;
  const sample = intake.textSample || '';
  if (sample.startsWith('Windows Registry Editor Version 5.00') ||
      sample.startsWith('REGEDIT4')) return 0.98;
  if (intake.filename?.toLowerCase().endsWith('.reg')) return 0.65;
  return 0;
}
