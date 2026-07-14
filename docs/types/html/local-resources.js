// Resolve relative HTML/CSS dependencies against files from the currently loaded folder. Blob
// URLs keep the preview local and work inside its opaque-origin sandbox; every URL is revoked with
// the preview request. Remote references are reported but never fetched here.

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const REMOTE_RE = /^(?:https?:)?\/\//i;

function normalizePath(path) {
  const out = [];
  for (const part of String(path || '').replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!out.length) return null;
      out.pop();
    } else {
      try { out.push(decodeURIComponent(part)); } catch { out.push(part); }
    }
  }
  return out.join('/');
}

function dirname(path) {
  const parts = String(path || '').split('/');
  parts.pop();
  return parts.join('/');
}

function splitReference(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^([^?#]*)([?#].*)?$/);
  return { raw, path: match?.[1] || '', suffix: match?.[2] || '' };
}

function mimeFor(path, fallback = '') {
  const ext = path.toLowerCase().split('.').pop();
  return ({
    css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
    svg: 'image/svg+xml', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
    ttf: 'font/ttf', otf: 'font/otf', mp3: 'audio/mpeg', wav: 'audio/wav', mp4: 'video/mp4',
  })[ext] || fallback || 'application/octet-stream';
}

function replaceAsync(text, regexp, replacer) {
  const matches = [...String(text || '').matchAll(regexp)];
  if (!matches.length) return Promise.resolve(String(text || ''));
  return Promise.all(matches.map((match) => replacer(...match))).then((replacements) => {
    let out = '', at = 0;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      out += text.slice(at, match.index) + replacements[i];
      at = match.index + match[0].length;
    }
    return out + text.slice(at);
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export async function rewriteLocalDependencies(html, folder) {
  const files = new Map();
  for (const entry of folder?.files || []) {
    const path = normalizePath(entry.path);
    if (path && entry.file) files.set(path, entry.file);
  }
  const currentPath = normalizePath(folder?.currentPath || '');
  if (!files.size || !currentPath) {
    return { html, report: { resolved: [], missing: [], remote: [], cssTexts: [] }, revoke() {} };
  }

  const created = new Set();
  const directUrls = new Map();
  const cssUrls = new Map();
  const resolved = new Set();
  const missing = new Set();
  const remote = new Set();
  const cssTexts = [];

  function resolvePath(value, basePath) {
    const ref = splitReference(value);
    if (!ref.raw || ref.raw.startsWith('#') || /^(?:data|blob|mailto|tel|javascript):/i.test(ref.raw)) return null;
    if (REMOTE_RE.test(ref.raw) || SCHEME_RE.test(ref.raw)) {
      if (REMOTE_RE.test(ref.raw) || /^https?:/i.test(ref.raw)) remote.add(ref.raw);
      return null;
    }
    const path = normalizePath(ref.path.startsWith('/') ? ref.path.slice(1) : dirname(basePath) + '/' + ref.path);
    if (!path || !files.has(path)) {
      if (ref.path) missing.add(ref.path);
      return { missing: true, path: ref.path };
    }
    return { path, suffix: ref.suffix };
  }

  async function directUrl(path) {
    if (directUrls.has(path)) return directUrls.get(path);
    const file = files.get(path);
    let blob = file;
    if (!file.type) blob = new Blob([await file.arrayBuffer()], { type: mimeFor(path) });
    const url = URL.createObjectURL(blob);
    directUrls.set(path, url);
    created.add(url);
    resolved.add(path);
    return url;
  }

  async function rewriteCss(css, basePath, stack = new Set()) {
    const rewritten = await replaceAsync(css, /@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1\s*\)?|url\(\s*(["']?)([^"')]+)\3\s*\)/gi,
      async (token, _importQuote, importRef, _urlQuote, urlRef) => {
        const ref = importRef || urlRef;
        const target = resolvePath(ref, basePath);
        if (!target) return token;
        const isImport = !!importRef;
        if (target.missing) {
          return isImport
            ? '/* missing local CSS import omitted: ' + ref.replace(/\*\//g, '') + ' */'
            : 'url("data:,")';
        }
        const url = isImport && target.path.toLowerCase().endsWith('.css')
          ? await cssUrl(target.path, stack)
          : await directUrl(target.path);
        if (!url) return '/* circular local CSS import omitted: ' + ref.replace(/\*\//g, '') + ' */';
        return isImport ? '@import url("' + url + target.suffix + '")' : 'url("' + url + target.suffix + '")';
      });
    cssTexts.push(rewritten);
    return rewritten;
  }

  async function cssUrl(path, stack = new Set()) {
    if (cssUrls.has(path)) return cssUrls.get(path);
    if (stack.has(path)) return null;
    const nextStack = new Set(stack); nextStack.add(path);
    const css = await rewriteCss(await files.get(path).text(), path, nextStack);
    // Like executable scripts, imported stylesheets are fetched from the preview's opaque origin.
    // A self-contained data URL avoids cross-origin rejection while retaining nested url() blobs.
    const url = 'data:text/css;base64,' + bytesToBase64(new TextEncoder().encode(css));
    cssUrls.set(path, url);
    resolved.add(path);
    return url;
  }

  async function rewriteRef(value, basePath, { css = false } = {}) {
    const target = resolvePath(value, basePath);
    if (!target) return value;
    if (target.missing) return 'data:,';
    const url = css ? await cssUrl(target.path) : await directUrl(target.path);
    return url ? url + target.suffix : value;
  }

  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const basePath = currentPath;

  // Inline local stylesheets. This lets the sanitized renderer continue forbidding arbitrary
  // <link> tags while preserving CSS that came from the explicitly loaded local folder.
  for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]) {
    const target = resolvePath(link.getAttribute('href'), basePath);
    if (!target || target.missing || !target.path.toLowerCase().endsWith('.css')) continue;
    const style = doc.createElement('style');
    style.dataset.fvLocalStylesheet = target.path;
    style.textContent = await rewriteCss(await files.get(target.path).text(), target.path);
    resolved.add(target.path);
    link.replaceWith(style);
  }

  // A blob URL created by the parent is intentionally cross-origin to an opaque sandbox and some
  // browsers refuse to load it as executable script. Data URLs remain isolated to the sandbox,
  // require no network access, and preserve the normal script gate, so use them for local JS.
  for (const script of doc.querySelectorAll('script[src]')) {
    const target = resolvePath(script.getAttribute('src'), basePath);
    if (!target) continue;
    if (target.missing) {
      script.setAttribute('src', 'data:,');
      continue;
    }
    const bytes = new Uint8Array(await files.get(target.path).arrayBuffer());
    script.setAttribute('src', 'data:' + mimeFor(target.path, 'text/javascript') + ';base64,' + bytesToBase64(bytes));
    script.dataset.fvLocalScript = target.path;
    resolved.add(target.path);
  }

  const refs = [
    ['img[src],iframe[src],source[src],track[src],video[src],audio[src],input[type="image"][src]', 'src'],
    ['video[poster]', 'poster'],
    ['object[data]', 'data'],
    ['svg image[href],svg use[href],svg feImage[href]', 'href'],
    ['svg image[xlink\\:href],svg use[xlink\\:href],svg feImage[xlink\\:href]', 'xlink:href'],
  ];
  for (const [selector, attribute] of refs) {
    for (const element of doc.querySelectorAll(selector)) {
      const value = element.getAttribute(attribute);
      element.setAttribute(attribute, await rewriteRef(value, basePath));
    }
  }
  for (const element of doc.querySelectorAll('[srcset]')) {
    const parts = element.getAttribute('srcset').split(',');
    const rewritten = [];
    for (const part of parts) {
      const match = part.trim().match(/^(\S+)(\s+.*)?$/);
      rewritten.push(match ? await rewriteRef(match[1], basePath) + (match[2] || '') : part);
    }
    element.setAttribute('srcset', rewritten.join(', '));
  }
  for (const style of doc.querySelectorAll('style')) {
    if (!style.dataset.fvLocalStylesheet) style.textContent = await rewriteCss(style.textContent, basePath);
  }
  for (const element of doc.querySelectorAll('[style]')) {
    element.setAttribute('style', await rewriteCss(element.getAttribute('style'), basePath));
  }

  // DOMPurify's fragment mode returns body content and intentionally omits the parsed <head>.
  // Move resolved/custom style blocks to the start of the body so safe previews retain them. A
  // <style> element is valid body metadata content, and moving it does not execute source code.
  const headStyles = [...doc.head.querySelectorAll('style')];
  if (headStyles.length) {
    const styles = doc.createDocumentFragment();
    for (const style of headStyles) styles.appendChild(style);
    doc.body.prepend(styles);
  }

  const serialized = '<!doctype html>\n' + doc.documentElement.outerHTML;
  return {
    html: serialized,
    report: { resolved: [...resolved], missing: [...missing], remote: [...remote], cssTexts },
    revoke() { for (const url of created) URL.revokeObjectURL(url); created.clear(); },
  };
}

export function dependencyCoverage(html, cssTexts = []) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const classes = new Set();
  for (const element of doc.querySelectorAll('[class]')) {
    for (const token of element.classList) if (token) classes.add(token);
  }
  if (classes.size < 8) return { classCount: classes.size, matched: 0, likelyMissing: false };
  const css = cssTexts.join('\n');
  let matched = 0;
  for (const token of classes) {
    const escaped = token.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    if (css.includes('.' + token) || css.includes('.' + escaped)) matched++;
  }
  return { classCount: classes.size, matched, likelyMissing: matched / classes.size < 0.2 };
}
