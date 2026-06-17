import { hasExtension, mimeMatches } from '../../core/detect.js';

// Cheap markdown detector. Extension/MIME are strong signals; for pasted text with no
// filename we fall back to lightweight content heuristics.
export function detect(intake) {
  if (intake.isBinary) return 0;
  if (hasExtension(intake, 'md', 'markdown', 'mdown', 'mkd', 'bts')) return 0.95;
  if (mimeMatches(intake, 'markdown')) return 0.9;

  const t = intake.textSample || '';
  if (!t.trim()) return 0;
  let hints = 0;
  if (/^#{1,6}\s+\S/m.test(t)) hints++;          // ATX heading
  if (/^\s*[-*+]\s+\S/m.test(t)) hints++;         // bullet list
  if (/\[[^\]]+\]\([^)]+\)/.test(t)) hints++;     // link
  if (/(^|\s)\*\*[^*]+\*\*/.test(t)) hints++;     // bold
  if (/^>\s+\S/m.test(t)) hints++;                // blockquote
  if (/^```/m.test(t)) hints++;                   // fenced code
  return Math.min(0.6, hints * 0.18);             // content-only never beats a real extension
}
