import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary && !hasExtension(intake, 'mxl')) return 0;
  if (hasExtension(intake, 'musicxml')) return 0.95;
  if (hasExtension(intake, 'mxl')) return 0.9;
  if (hasExtension(intake, 'xml')) {
    const head = (intake.text || '').slice(0, 1200);
    if (/<score-partwise|<score-timewise/i.test(head)) return 0.8;
    return 0;
  }
  const head = (intake.text || '').slice(0, 1200);
  if (/<score-partwise|<score-timewise/i.test(head)) return 0.6;
  return 0;
}
