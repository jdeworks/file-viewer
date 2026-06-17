import { hasExtension } from '../../../core/detect.js';

// URL / query-string inspector: high score for https:// URLs, stepping down through other
// schemes, bare query strings, multi-URL files, and .url/.webloc extensions.
// Cap at 0.80 so generic-enough text wins only when no specific type claims the file.
export function detect(intake) {
  if (intake.isBinary) return 0;
  const t = (intake.textSample || '').trim();
  if (!t) return 0;

  if (/^https?:\/\//i.test(t)) return Math.min(0.80, 0.90);
  if (/^(ftp|file|data|blob|mailto|tel|ssh|git):\/\//i.test(t)) return Math.min(0.80, 0.85);
  if (/^\?[^=\n]+=[^&\n]/.test(t)) return 0.80;
  const multiUrl = (t.match(/^https?:\/\//gmi) || []).length;
  if (multiUrl >= 3) return 0.75;
  if (hasExtension(intake, 'url', 'webloc')) return 0.70;
  return 0;
}
