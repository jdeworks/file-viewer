// HTML preview with an explicit script gate (WP07). Default: DOMPurify-sanitized (scripts
// stripped, off-origin-fetch vectors neutralized) into our themed iframe. If the user opts in
// (ctx.allowScripts), the raw document renders as the iframe srcdoc so its scripts run —
// still in sandbox="allow-scripts" only (no allow-same-origin), so it cannot reach the parent.
import { loadGlobal, vendor } from '../../core/script-loader.js';

// Heuristic: does the source contain executable script (tags, inline handlers, js: urls)?
const SCRIPT_RE = /<script[\s>]|\son\w+\s*=|javascript:/i;
const HTML_ALLOWED_URI = /^(?:(?:(?:f|ht)tps?|blob|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
export function containsScripts(html) { return SCRIPT_RE.test(html || ''); }

function applyInjectHead(html, injectHead) {
  if (!injectHead) return html;
  const tags = injectHead.split('\n').map((t) => t.trim()).filter(Boolean).join('\n');
  if (!tags) return html;
  if (html.includes('</head>')) return html.replace('</head>', tags + '\n</head>');
  if (html.includes('</body>')) return html.replace('</body>', tags + '\n</body>');
  return tags + '\n' + html;
}

function isLocalResourceUrl(value) {
  const raw = String(value || '').trim();
  if (/^(?:data|blob):/i.test(raw)) return true;
  try {
    const appUrl = new URL(window.location.href);
    const resourceUrl = new URL(raw, appUrl);
    if (appUrl.protocol === 'file:' && resourceUrl.protocol === 'file:') return true;
    return /^(?:https?):$/.test(resourceUrl.protocol) && resourceUrl.origin === appUrl.origin;
  } catch {
    return false;
  }
}

// CSSOM canonicalizes case, whitespace, entities, image-set strings, and CSS escapes such as
// `u\72l(...)` before we inspect declarations. The remaining URL tokens are therefore a small,
// predictable grammar. Replacing only remote tokens preserves local/data/blob URLs alongside them.
function neutralizeCanonicalCssUrls(value) {
  let blocked = false;
  const css = String(value || '').replace(
    /url\(\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^)]*))\s*\)/gi,
    (token, doubleQuoted, singleQuoted, bare) => {
      const raw = doubleQuoted ?? singleQuoted ?? bare ?? '';
      // CSSOM normally emits an unescaped absolute/string value. Handle the few escapes it can
      // preserve in custom properties so an encoded quote/backslash cannot conceal a remote URL.
      const decoded = raw.replace(/\\([0-9a-f]{1,6})(?:\s)?|\\([^\r\n\f])/gi, (_m, hex, char) => {
        if (hex) return String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff));
        return char || '';
      });
      if (isLocalResourceUrl(decoded)) return token;
      blocked = true;
      return 'url("data:,")';
    },
  );
  return { css, blocked };
}

function neutralizePresentationUrl(property, value) {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  return neutralizeCanonicalCssUrls(probe.style.getPropertyValue(property) || value);
}

function decodeCssEscapesForInspection(value) {
  return String(value || '').replace(/\\([0-9a-f]{1,6})(?:\s)?|\\([^\r\n\f])/gi, (_match, hex, char) => {
    if (hex) return String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff));
    return char || '';
  });
}

function sanitizeStyleDeclaration(style) {
  let blocked = false;
  for (const property of [...style]) {
    const priority = style.getPropertyPriority(property);
    const value = style.getPropertyValue(property);
    if (property.startsWith('--')) {
      // Custom-property values are intentionally not parsed/canonicalized by CSSOM. Decode them
      // only for inspection; if they conceal an off-origin absolute URL, drop that variable before
      // a later `var()` can turn it into a background/font/cursor request. Local/relative/data/blob
      // custom values stay byte-for-byte intact.
      const inspected = decodeCssEscapesForInspection(value);
      const urls = inspected.match(/(?:https?:)?\/\/[^\s"'()]*/gi) || [];
      if (urls.some((url) => !isLocalResourceUrl(url))) {
        style.removeProperty(property);
        blocked = true;
        continue;
      }
    }
    const result = neutralizeCanonicalCssUrls(value);
    if (result.blocked) {
      style.setProperty(property, result.css, priority);
      blocked = true;
    }
  }
  return blocked;
}

function sanitizeStylesheet(cssText) {
  // Parse in a detached document. It has no browsing context, so even CSSImportRule creation is
  // inert; unlike regex, CSSOM also understands escaped `url`, @font-face, cursor, image-set, and
  // nested @media/@supports/@layer rules. Safe imports are retained verbatim after canonicalizing.
  const doc = document.implementation.createHTMLDocument('');
  const style = doc.createElement('style');
  style.textContent = cssText || '';
  doc.head.appendChild(style);
  let blocked = false;

  function visit(owner) {
    const rules = owner.cssRules;
    if (!rules) return;
    for (let index = rules.length - 1; index >= 0; index--) {
      const rule = rules[index];
      if (rule.type === CSSRule.IMPORT_RULE) {
        if (!isLocalResourceUrl(rule.href)) { owner.deleteRule(index); blocked = true; }
        continue;
      }
      if (rule.style && sanitizeStyleDeclaration(rule.style)) blocked = true;
      if (rule.cssRules) visit(rule);
    }
  }
  visit(style.sheet);
  return { css: [...style.sheet.cssRules].map((rule) => rule.cssText).join('\n'), blocked };
}

// Run on an inert template, never on mounted DOM. This covers every eager `src`, SVG external
// reference, CSS declaration, stylesheet import, and SVG presentation URL before srcdoc is set.
// Ordinary links remain links because navigation requires an explicit user action.
function neutralizeRemoteResources(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  let blocked = false;

  for (const element of tpl.content.querySelectorAll('[src]')) {
    if (isLocalResourceUrl(element.getAttribute('src'))) continue;
    element.removeAttribute('src');
    blocked = true;
  }

  for (const svg of tpl.content.querySelectorAll('svg')) {
    for (const element of [svg, ...svg.querySelectorAll('*')]) {
      if (element.namespaceURI !== 'http://www.w3.org/2000/svg' || element.localName.toLowerCase() === 'a') continue;
      for (const attribute of [...element.attributes]) {
        if (attribute.localName.toLowerCase() !== 'href' || isLocalResourceUrl(attribute.value)) continue;
        element.removeAttributeNode(attribute);
        blocked = true;
      }
    }
  }

  for (const style of tpl.content.querySelectorAll('style')) {
    const result = sanitizeStylesheet(style.textContent);
    style.textContent = result.css;
    if (result.blocked) blocked = true;
  }
  for (const element of tpl.content.querySelectorAll('[style]')) {
    if (sanitizeStyleDeclaration(element.style)) blocked = true;
  }

  // SVG presentation attributes accept CSS url() even though they are not `style` declarations.
  const presentationUrls = ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker',
    'marker-start', 'marker-mid', 'marker-end', 'cursor', 'color-profile'];
  for (const element of tpl.content.querySelectorAll(presentationUrls.map((name) => `[${name}]`).join(','))) {
    for (const attribute of presentationUrls) {
      if (!element.hasAttribute(attribute)) continue;
      const result = neutralizePresentationUrl(attribute, element.getAttribute(attribute));
      if (result.blocked) { element.setAttribute(attribute, result.css); blocked = true; }
    }
  }

  return { html: tpl.innerHTML, blocked };
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
    ALLOWED_URI_REGEXP: HTML_ALLOWED_URI,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base', 'link'],
    FORBID_ATTR: ['background', 'poster', 'srcset', 'onerror', 'onload', 'onclick'],
  });
  const resources = neutralizeRemoteResources(clean);
  // Sanitized path: append user-configured tags after sanitization (user trusts their own settings).
  const injected = applyInjectHead(resources.html, injectHead);
  return { bodyHtml: injected, containsScripts: containsScripts(raw), hadUnsafe: DOMPurify.removed.length > 0 || resources.blocked };
}
