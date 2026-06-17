import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'gcode', 'gc', 'nc', 'ngc')) return 0.90;
  const sample = (intake.text || '').slice(0, 2048);
  const signals = ['G0 ', 'G1 ', 'G28', 'M104', 'M109', 'M140', ';LAYER:'];
  const hits = signals.filter((s) => sample.includes(s)).length;
  if (hits >= 2) return 0.80;
  return 0;
}
