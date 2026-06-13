import { hasExtension } from '../../core/detect.js';

// Unified diff / patch files.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'patch', 'diff')) return 0.9;
  const t = intake.textSample || '';
  if (/^diff --git /m.test(t)) return 0.8;
  if (/^@@ -\d/m.test(t) && /^(\+\+\+|---) /m.test(t)) return 0.75;
  return 0;
}
