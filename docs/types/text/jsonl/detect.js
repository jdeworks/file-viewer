import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'jsonl', 'ndjson')) return 0.92;
  // Content heuristic: two separate JSON values on consecutive lines (don't fire on .json)
  if (!hasExtension(intake, 'json')) {
    const lines = (intake.text || '').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
    if (lines.length >= 2) {
      try {
        JSON.parse(lines[0]);
        JSON.parse(lines[1]);
        const s = lines[0].trim()[0];
        if (s === '{' || s === '[') return 0.55;
      } catch {}
    }
  }
  return 0;
}
