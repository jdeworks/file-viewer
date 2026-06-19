import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'h2song', 'h2pattern', 'h2drumkit')) return 0.9;
  const t = intake.textSample || '';
  if (/<hydrogen_drumkit>/i.test(t) || /<song version="[^"]*hydrogen/i.test(t)) return 0.97;
  return 0;
}
