// HTML preview with an explicit script gate (WP07). Default: DOMPurify-sanitized (scripts
// stripped) into our themed iframe. If the user opts in (ctx.allowScripts), the raw document
// renders as the iframe srcdoc so its scripts run — still in sandbox="allow-scripts" only
// (no allow-same-origin), so it cannot reach the parent.
import { loadGlobal, vendor } from '../../core/script-loader.js';

// Heuristic: does the source contain executable script (tags, inline handlers, js: urls)?
const SCRIPT_RE = /<script[\s>]|\son\w+\s*=|javascript:/i;
export function containsScripts(html) { return SCRIPT_RE.test(html || ''); }

function applyInjectHead(html, injectHead) {
  if (!injectHead) return html;
  const tags = injectHead.split('\n').map((t) => t.trim()).filter(Boolean).join('\n');
  if (!tags) return html;
  if (html.includes('</head>')) return html.replace('</head>', tags + '\n</head>');
  if (html.includes('</body>')) return html.replace('</body>', tags + '\n</body>');
  return tags + '\n' + html;
}

export async function render(intake, ctx) {
  const raw = intake.text || '';
  const injectHead = (ctx?.settings?.htmlInjectHead || '').trim();
  if (ctx?.allowScripts) {
    // Script-enabled path: inject user tags into the live document before it runs.
    return { fullDoc: applyInjectHead(raw, injectHead), ranScripts: true, containsScripts: containsScripts(raw) };
  }
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'], FORBID_TAGS: ['script'] });
  // Sanitized path: append user-configured tags after sanitization (user trusts their own settings).
  const injected = applyInjectHead(clean, injectHead);
  return { bodyHtml: injected, containsScripts: containsScripts(raw), hadUnsafe: DOMPurify.removed.length > 0 };
}
