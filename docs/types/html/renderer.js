// HTML preview with an explicit script gate (WP07). Default: DOMPurify-sanitized (scripts
// stripped, off-origin-fetch vectors neutralized) into our themed iframe. If the user opts in
// (ctx.allowScripts), the raw document renders as the iframe srcdoc so its scripts run —
// still in sandbox="allow-scripts" only (no allow-same-origin), so it cannot reach the parent.
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

const ABS_URL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;   // scheme:// or protocol-relative //

// Blank an <img>'s src if it points off-origin. This app has no way to resolve a standalone
// HTML file's original sibling assets, so a same-origin-relative or data: src is the only
// thing that can ever legitimately render; a remote absolute/protocol-relative src can only
// ever be a live phone-home request fired just by opening the file (classic tracking pixel).
function blankOffOriginImgSrc(html) {
  return html.replace(/(<img\b[^>]*\bsrc\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/gi, (full, pre, val) => {
    const unquoted = val.replace(/^['"]|['"]$/g, '');
    return ABS_URL_RE.test(unquoted.trim()) ? pre + '""' : full;
  });
}

// DOMPurify does not parse or sanitize CSS: <style> tag content and style="" attribute values
// pass through as opaque text, so a background-image / @font-face / @import url() referencing
// an off-origin host would fire an eager, silent network request the instant the preview
// renders — the same vector class as the <img> case above, just via CSS instead of markup.
function stripOffOriginCssUrls(html) {
  return html
    .replace(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi, (full, _q, ref) => (ABS_URL_RE.test(ref.trim()) ? 'url()' : full))
    .replace(/@import\s+(['"])([^'"]*)\1/gi, (full, _q, ref) => (ABS_URL_RE.test(ref.trim()) ? '/* import blocked */' : full));
}

export async function render(intake, ctx) {
  const raw = intake.text || '';
  const injectHead = (ctx?.settings?.htmlInjectHead || '').trim();
  if (ctx?.allowScripts) {
    // Script-enabled path: inject user tags into the live document before it runs. This is an
    // explicit, user-confirmed opt-in (WP07) — the raw document (including any off-origin
    // references or scripts it contains) is trusted once the user picks this mode.
    return { fullDoc: applyInjectHead(raw, injectHead), ranScripts: true, containsScripts: containsScripts(raw) };
  }
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  DOMPurify.removed = [];
  // FORBID_TAGS/FORBID_ATTR cover every DOMPurify-default-allowed vector that can trigger a live
  // off-origin network request we don't control: <iframe>/<object>/<embed>/<video>/<audio>/
  // <source>/<track>/<form>/<meta>/<base>/<link> (a <base href> would turn even a *relative*
  // <img src> into an off-origin request) and legacy background=/poster= attributes. <style> /
  // style="" and <img src> stay allowed — this type's documented "layout, styles, images work"
  // capability — but any off-origin reference inside them is neutralized below (DOMPurify itself
  // doesn't understand CSS, so it can't strip a url() for us).
  const clean = DOMPurify.sanitize(raw, {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base', 'link'],
    FORBID_ATTR: ['background', 'poster', 'srcset', 'onerror', 'onload', 'onclick'],
  });
  const safe = stripOffOriginCssUrls(blankOffOriginImgSrc(clean));
  // Sanitized path: append user-configured tags after sanitization (user trusts their own settings).
  const injected = applyInjectHead(safe, injectHead);
  return { bodyHtml: injected, containsScripts: containsScripts(raw), hadUnsafe: DOMPurify.removed.length > 0 || safe !== clean };
}
