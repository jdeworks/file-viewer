import { hasExtension, mimeMatches } from '../../core/detect.js';

export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'toml')) return 0.95;
  if (mimeMatches(intake, 'toml')) return 0.9;
  // Cargo.toml / pyproject.toml etc. are named, but also sniff: a [table] header or key=val.
  const t = intake.textSample || '';
  if (/^\[\[?[\w.-]+\]\]?\s*$/m.test(t) && /^\s*[\w."-]+\s*=/m.test(t)) return 0.6;
  return 0;
}
