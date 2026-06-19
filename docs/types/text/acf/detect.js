import { hasExtension } from '../../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (!hasExtension(intake, 'acf')) return 0;
  const t = intake.textSample || '';
  // Valve KeyValues format — top-level key is typically "AppState"
  if (/^\s*"AppState"\s*\{/.test(t)) return 0.98;
  if (/^\s*"[^"]+"\s*\{/.test(t)) return 0.7;
  return 0.5;
}
