import { hasExtension, mimeMatches } from '../../core/detect.js';

// Jupyter notebooks are JSON, so this must outrank the generic JSON detector for .ipynb.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'ipynb')) return 0.98;
  if (mimeMatches(intake, 'ipynb')) return 0.95;
  // Content sniff (cheap — no full parse): notebook JSON carries both keys near the top.
  const t = intake.textSample || '';
  if (/"nbformat"\s*:/.test(t) && /"cells"\s*:/.test(t)) return 0.9;
  return 0;
}
