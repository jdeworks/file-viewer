// Shared inert SVG resource sanitizer used by both the dedicated SVG editor and the generic image
// renderer. It removes executable/fetch-capable markup and lets the browser's DOM/CSS parsers
// canonicalize entities, case, whitespace, CSS escapes, imports, and image-set before URL policy.

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

function neutralizeCssUrls(value) {
  let blocked = false;
  const css = String(value || '').replace(
    /url\(\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^)]*))\s*\)/gi,
    (token, doubleQuoted, singleQuoted, bare) => {
      const raw = doubleQuoted ?? singleQuoted ?? bare ?? '';
      const decoded = raw.replace(/\\([0-9a-f]{1,6})(?:\s)?|\\([^\r\n\f])/gi, (_match, hex, char) => {
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
  // Presentation attributes are CSS values, so let CSSOM canonicalize an escaped function name
  // such as `u\72l(...)` before applying the URL policy. Invalid values fall back to raw text.
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  return neutralizeCssUrls(probe.style.getPropertyValue(property) || value);
}

function sanitizeDeclaration(style) {
  for (const property of [...style]) {
    const priority = style.getPropertyPriority(property);
    const value = style.getPropertyValue(property);
    if (property.startsWith('--')) {
      const inspected = value.replace(/\\([0-9a-f]{1,6})(?:\s)?|\\([^\r\n\f])/gi, (_match, hex, char) =>
        hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : (char || ''));
      const urls = inspected.match(/(?:https?:)?\/\/[^\s"'()]*/gi) || [];
      if (urls.some((url) => !isLocalResourceUrl(url))) { style.removeProperty(property); continue; }
    }
    const result = neutralizeCssUrls(value);
    if (result.blocked) style.setProperty(property, result.css, priority);
  }
}

function sanitizeStylesheet(cssText) {
  const detached = document.implementation.createHTMLDocument('');
  const style = detached.createElement('style');
  style.textContent = cssText || '';
  detached.head.appendChild(style);
  function visit(owner) {
    if (!owner.cssRules) return;
    for (let index = owner.cssRules.length - 1; index >= 0; index--) {
      const rule = owner.cssRules[index];
      if (rule.type === CSSRule.IMPORT_RULE) {
        if (!isLocalResourceUrl(rule.href)) owner.deleteRule(index);
        continue;
      }
      if (rule.style) sanitizeDeclaration(rule.style);
      if (rule.cssRules) visit(rule);
    }
  }
  visit(style.sheet);
  return [...style.sheet.cssRules].map((rule) => rule.cssText).join('\n');
}

function parseSvg(source) {
  const parsed = new DOMParser().parseFromString(source || '', 'image/svg+xml');
  if (!parsed.querySelector('parsererror') && parsed.documentElement?.localName.toLowerCase() === 'svg') return parsed.documentElement;
  // Malformed XML is reparsed with the browser's inert HTML fragment parser; only an actual SVG
  // root is retained. Nothing is connected to the live document during either parse.
  const template = document.createElement('template');
  template.innerHTML = source || '';
  return template.content.querySelector('svg') || document.createElementNS('http://www.w3.org/2000/svg', 'svg');
}

export function sanitizeSvg(source) {
  const root = parseSvg(source);
  root.querySelectorAll('script,iframe,object,embed,video,audio,source,track,link,meta,base,form,animate,animateMotion,animateTransform,set').forEach((element) => element.remove());
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name) || ['srcset', 'poster', 'background'].includes(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  for (const element of [root, ...root.querySelectorAll('[src]')]) {
    if (!element.hasAttribute('src')) continue;
    if (!isLocalResourceUrl(element.getAttribute('src'))) element.removeAttribute('src');
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (element.localName.toLowerCase() === 'a') continue;
    for (const attribute of [...element.attributes]) {
      // Attr selectors/removal by qualified name are inconsistent for xlink:href in XML DOMs.
      // Inspect the Attr nodes and remove the exact node so both href namespaces are covered.
      if (attribute.localName.toLowerCase() !== 'href') continue;
      if (!isLocalResourceUrl(attribute.value)) element.removeAttributeNode(attribute);
    }
  }
  for (const style of root.querySelectorAll('style')) style.textContent = sanitizeStylesheet(style.textContent);
  for (const element of [root, ...root.querySelectorAll('[style]')]) {
    if (element.hasAttribute('style')) sanitizeDeclaration(element.style);
  }
  const presentationUrls = ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker',
    'marker-start', 'marker-mid', 'marker-end', 'cursor', 'color-profile'];
  for (const element of [root, ...root.querySelectorAll(presentationUrls.map((name) => `[${name}]`).join(','))]) {
    for (const attribute of presentationUrls) {
      if (!element.hasAttribute(attribute)) continue;
      const result = neutralizePresentationUrl(attribute, element.getAttribute(attribute));
      if (result.blocked) element.setAttribute(attribute, result.css);
    }
  }
  return new XMLSerializer().serializeToString(root);
}
