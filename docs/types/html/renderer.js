// HTML preview with an explicit script gate (WP07). Default: DOMPurify-sanitized (scripts
// stripped) into our themed iframe. If the user opts in (ctx.allowScripts), the raw document
// renders as the iframe srcdoc so its scripts run — still in sandbox="allow-scripts" only
// (no allow-same-origin), so it cannot reach the parent.
import { loadGlobal, vendor } from '../../core/script-loader.js';

// Heuristic: does the source contain executable script (tags, inline handlers, js: urls)?
const SCRIPT_RE = /<script[\s>]|\son\w+\s*=|javascript:/i;
export function containsScripts(html) { return SCRIPT_RE.test(html || ''); }

export async function render(intake, ctx) {
  const html = intake.text || '';
  if (ctx?.allowScripts) {
    return { fullDoc: html, ranScripts: true, containsScripts: containsScripts(html) };
  }
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target'], FORBID_TAGS: ['script'] });
  return { bodyHtml: clean, containsScripts: containsScripts(html), hadUnsafe: DOMPurify.removed.length > 0 };
}
