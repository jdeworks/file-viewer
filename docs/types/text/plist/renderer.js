function plistToValue(el) {
  switch (el.tagName) {
    case 'dict': {
      const children = [...el.children];
      const obj = {};
      for (let i = 0; i < children.length; i += 2) {
        obj[children[i].textContent] = plistToValue(children[i + 1]);
      }
      return obj;
    }
    case 'array': return [...el.children].map(plistToValue);
    case 'string': return el.textContent;
    case 'integer': return parseInt(el.textContent, 10);
    case 'real': return parseFloat(el.textContent);
    case 'true': return true;
    case 'false': return false;
    case 'data': return `<data: ${el.textContent.trim().slice(0, 40)}${el.textContent.trim().length > 40 ? '…' : ''}>`;
    case 'date': return el.textContent; // ISO 8601 string
    default: return el.textContent;
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderValue(val, depth) {
  if (val === null || val === undefined) {
    return '<span class="pl-null">null</span>';
  }
  if (typeof val === 'boolean') {
    return val
      ? '<span class="pl-true">true</span>'
      : '<span class="pl-false">false</span>';
  }
  if (typeof val === 'number') {
    return `<span class="pl-num">${esc(val)}</span>`;
  }
  // Date string: ISO 8601
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(val)) {
    const formatted = (() => { try { return new Date(val).toLocaleString(); } catch { return val; } })();
    return `<span class="pl-date" title="${esc(val)}">${esc(formatted)}</span>`;
  }
  // Data placeholder
  if (typeof val === 'string' && val.startsWith('<data: ')) {
    return `<span class="pl-data">${esc(val)}</span>`;
  }
  if (typeof val === 'string') {
    return `<span class="pl-str">&quot;${esc(val)}&quot;</span>`;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '<span class="pl-bracket">[]</span>';
    const indent = '  '.repeat(depth + 1);
    const items = val.map((item, i) => {
      const isComplex = typeof item === 'object' && item !== null;
      if (isComplex) {
        const inner = renderValue(item, depth + 1);
        return `<div class="pl-row">`
          + `<span class="pl-idx pl-key">[${i}]</span>`
          + `<div class="pl-children">${inner}</div>`
          + `</div>`;
      }
      return `<div class="pl-row"><span class="pl-idx">[${i}]</span> ${renderValue(item, depth + 1)}</div>`;
    }).join('');
    return `<div class="pl-array">${items}</div>`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '<span class="pl-bracket">{}</span>';
    const items = keys.map((k) => {
      const child = val[k];
      const isComplex = typeof child === 'object' && child !== null;
      if (isComplex) {
        const inner = renderValue(child, depth + 1);
        return `<div class="pl-row">`
          + `<span class="pl-key" title="${esc(k)}">${esc(k)}</span>`
          + `<div class="pl-children">${inner}</div>`
          + `</div>`;
      }
      return `<div class="pl-row"><span class="pl-key-plain">${esc(k)}</span>: ${renderValue(child, depth + 1)}</div>`;
    }).join('');
    return `<div class="pl-dict">${items}</div>`;
  }
  return esc(String(val));
}

function calcDepth(val, d = 0) {
  if (typeof val !== 'object' || val === null) return d;
  const children = Array.isArray(val) ? val : Object.values(val);
  return Math.max(d, ...children.map((c) => calcDepth(c, d + 1)));
}

export async function render(intake, _ctx) {
  const bytes = intake.bytes;

  // Binary plist detection
  if (bytes && bytes.length >= 8) {
    const magic = String.fromCharCode(...bytes.slice(0, 8));
    if (magic === 'bplist00') {
      const bodyHtml = `
<div class="pl-binary-notice">
  <p><strong>Binary property list (.plist)</strong> — binary format not parsed.</p>
  <p>Open in Xcode or convert with:</p>
  <pre>plutil -convert xml1 file.plist</pre>
</div>`;
      return { bodyHtml, hadUnsafe: false };
    }
  }

  const text = intake.text || '';

  // Parse XML
  let rootValue;
  let parseOk = false;
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const parseErr = doc.querySelector('parsererror');
    if (!parseErr) {
      const plistEl = doc.querySelector('plist');
      const rootEl = plistEl ? plistEl.firstElementChild : doc.documentElement?.firstElementChild;
      if (rootEl) {
        rootValue = plistToValue(rootEl);
        parseOk = true;
      }
    }
  } catch { /* fall through */ }

  if (!parseOk) {
    return {
      bodyHtml: `<pre class="pl-raw">${esc(text)}</pre>`,
      hadUnsafe: false,
    };
  }

  // Stats
  const rootKeys = (typeof rootValue === 'object' && !Array.isArray(rootValue) && rootValue !== null)
    ? Object.keys(rootValue).length
    : Array.isArray(rootValue) ? rootValue.length : 0;
  const depth = calcDepth(rootValue);
  const rootTypeLabel = Array.isArray(rootValue) ? 'array' : (typeof rootValue === 'object' && rootValue !== null ? 'dict' : typeof rootValue);

  const treeHtml = renderValue(rootValue, 0);

  const bodyHtml = `
<style>
  body { font-family: system-ui, sans-serif; font-size: 14px; margin: 0; padding: 12px 16px; background: var(--bg, #fff); color: var(--fg, #222); }
  @media (prefers-color-scheme: dark) { body { --bg: #1e1e1e; --fg: #d4d4d4; } }
  .pl-tree { line-height: 1.7; }
  .pl-row { margin: 1px 0; padding-left: 1.2em; border-left: 2px solid transparent; }
  .pl-row:hover { border-left-color: #aaa4; background: #8882; border-radius: 2px; }
  .pl-key { cursor: pointer; user-select: none; font-weight: 600; color: #0070c1; }
  @media (prefers-color-scheme: dark) { .pl-key { color: #9cdcfe; } }
  .pl-key::before { content: '▾ '; font-size: 0.85em; }
  .pl-key.collapsed::before { content: '▸ '; }
  .pl-key-plain { font-weight: 600; color: #0070c1; }
  @media (prefers-color-scheme: dark) { .pl-key-plain { color: #9cdcfe; } }
  .pl-idx { color: #666; font-style: italic; }
  .pl-children { padding-left: 1.4em; border-left: 2px solid #ddd8; margin-left: 0.2em; }
  @media (prefers-color-scheme: dark) { .pl-children { border-left-color: #4444; } }
  .pl-children.hidden { display: none; }
  .pl-str { color: #a31515; font-family: monospace; }
  @media (prefers-color-scheme: dark) { .pl-str { color: #ce9178; } }
  .pl-num { color: #098658; font-family: monospace; }
  @media (prefers-color-scheme: dark) { .pl-num { color: #b5cea8; } }
  .pl-true { color: #067d17; font-weight: bold; font-family: monospace; }
  @media (prefers-color-scheme: dark) { .pl-true { color: #4ec94e; } }
  .pl-false { color: #c7254e; font-weight: bold; font-family: monospace; }
  @media (prefers-color-scheme: dark) { .pl-false { color: #f47070; } }
  .pl-date { color: #7a3e9d; font-family: monospace; }
  @media (prefers-color-scheme: dark) { .pl-date { color: #c586c0; } }
  .pl-data { color: #7a5c00; font-family: monospace; font-style: italic; }
  @media (prefers-color-scheme: dark) { .pl-data { color: #d7ba7d; } }
  .pl-null { color: #aaa; font-family: monospace; }
  .pl-bracket { color: #888; font-family: monospace; }
  .pl-raw { padding: 12px; background: #f5f5f5; border-radius: 4px; overflow: auto; font-size: 13px; white-space: pre-wrap; word-break: break-all; }
  @media (prefers-color-scheme: dark) { .pl-raw { background: #2d2d2d; } }
  .pl-footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #ddd; color: #888; font-size: 12px; }
  @media (prefers-color-scheme: dark) { .pl-footer { border-top-color: #444; } }
  .pl-binary-notice { padding: 20px; background: #fff8e1; border: 1px solid #ffe082; border-radius: 6px; }
  @media (prefers-color-scheme: dark) { .pl-binary-notice { background: #3a3000; border-color: #7a6000; } }
  .pl-binary-notice pre { background: #0001; padding: 8px 12px; border-radius: 4px; font-size: 13px; }
</style>
<div class="pl-tree">${treeHtml}</div>
<div class="pl-footer">Root type: <strong>${esc(rootTypeLabel)}</strong> &nbsp;&bull;&nbsp; Top-level keys/items: <strong>${rootKeys}</strong> &nbsp;&bull;&nbsp; Max nesting depth: <strong>${depth}</strong></div>
<script>
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('pl-key')) {
      e.target.classList.toggle('collapsed');
      var sib = e.target.nextElementSibling;
      if (sib && sib.classList.contains('pl-children')) {
        sib.classList.toggle('hidden');
      }
    }
  });
<\/script>`;

  return { bodyHtml, hadUnsafe: false };
}
