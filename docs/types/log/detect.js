import { hasExtension } from '../../core/detect.js';

// Log files — by extension, or a content sniff for timestamped / leveled lines.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'log')) return 0.85;
  const t = intake.textSample || '';
  const leveled = (t.match(/\b(ERROR|WARN(?:ING)?|INFO|DEBUG|TRACE|FATAL)\b/g) || []).length;
  const tsLines = (t.match(/^\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/gm) || []).length;
  if (tsLines >= 3 && leveled >= 2) return 0.4;
  return 0;
}
