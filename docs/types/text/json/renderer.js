// JSON preview: a collapsible tree (scriptless, via <details>/<summary>). Parse errors
// surface a clear message with the position. Editable text, so raw + diff still apply.
// The live preview also carries an optional JSONPath/property query panel (core/query-panel.js)
// that highlights/filters matching nodes; a static bodyHtml is returned alongside so screenshots
// and Print/Save-as-PDF still work.
import { parseJsonLike } from './jsonparse.js';
import { createQueryPanel, jsonPathQuery } from '../../../core/query-panel.js';
import { ensureKnownUiStyle, issueList, maskedValue, sourcePreview, wireSourceLinks } from '../../../core/known-ui.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const JSON_EXTRA_CSS = `
.json-redacted{color:var(--fg-2,#6b7280);font-style:italic}
.json-src-key{color:#0550ae;font-weight:700}
.json-src-string{color:#0a7f38}
.json-copy-menu{position:fixed;z-index:180;display:grid;gap:2px;min-width:190px;padding:5px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,.25)}
.json-copy-menu[hidden]{display:none}
.json-copy-menu button{display:block;width:100%;padding:7px 9px;border:0;border-radius:6px;background:transparent;color:var(--fg,#24292f);font:12px system-ui,sans-serif;text-align:left;cursor:pointer}
.json-copy-menu button:hover{background:var(--bg-3,#eaeef2)}
.json-copy-toast{position:fixed;z-index:181;right:16px;bottom:16px;padding:7px 10px;border-radius:7px;background:var(--bg-2,#f6f8fa);border:1px solid var(--border,#d0d7de);box-shadow:0 8px 22px rgba(0,0,0,.22);font:12px system-ui,sans-serif;color:var(--fg,#24292f)}
`;

function entriesFor(val, sortMode) {
  if (Array.isArray(val)) return val.map((v, i) => [i, v]);
  const entries = Object.entries(val);
  if (sortMode === 'A-Z') return entries.sort(([a], [b]) => a.localeCompare(b));
  if (sortMode === 'Z-A') return entries.sort(([a], [b]) => b.localeCompare(a));
  return entries;
}

// `path` is the dot-joined JSONPath of this node (used for query→DOM mapping via data-qp-path).
function valueNode(key, val, sortMode, path, secrets) {
  const keyHtml = key !== null ? '<span class="j-key">' + esc(key) + '</span>: ' : '';
  const pathAttr = ' data-qp-path="' + esc(path) + '"';
  const copyAttrs = ' data-json-path="' + esc(jsonPathFromPath(path)) + '"' + (key !== null ? ' data-json-key="' + esc(key) + '"' : '');
  if (val === null) return '<div class="j-row"' + pathAttr + copyAttrs + '>' + keyHtml + '<span class="j-null">null</span></div>';
  const t = typeof val;
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = entriesFor(val, sortMode);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    const count = entries.length;
    if (!count) return '<div class="j-row"' + pathAttr + copyAttrs + '>' + keyHtml + '<span class="j-punc">' + open + close + '</span></div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, sortMode, path ? path + '.' + k : String(k), secrets)).join('');
    return '<details class="j-node" open' + pathAttr + copyAttrs + '><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + count + (isArr ? ' items' : ' keys') + '</span></summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const secret = secrets.get(path);
  const disp = secret ? `<span class="json-redacted" title="${esc(secret.reason)}">"[configured]"</span>` : (t === 'string' ? '"' + esc(val) + '"' : esc(String(val)));
  if (secret) return '<div class="j-row"' + pathAttr + copyAttrs + ' data-json-redacted="1">' + keyHtml + disp + '</div>';
  return '<div class="j-row"' + pathAttr + copyAttrs + '>' + keyHtml + '<span class="' + cls + '">' + disp + '</span></div>';
}

function jsonPathFromPath(path) {
  if (!path) return '$';
  return '$' + String(path).split('.').map((part) => {
    if (/^\d+$/.test(part)) return '[' + part + ']';
    if (/^[A-Za-z_$][\w$]*$/.test(part)) return '.' + part;
    return '[' + JSON.stringify(part) + ']';
  }).join('');
}

function valueAtPath(data, path) {
  if (!path) return data;
  let node = data;
  for (const part of String(path).split('.')) {
    if (node == null) return undefined;
    node = node[part];
  }
  return node;
}

function copyTextForValue(data, path, redacted) {
  if (redacted) return '[configured]';
  const val = valueAtPath(data, path);
  if (typeof val === 'string') return val;
  return JSON.stringify(val, null, 2);
}

function nearestCopyTarget(node, treeRoot) {
  const el = node?.closest?.('.j-row[data-qp-path], .j-node[data-qp-path], summary');
  if (!el) return null;
  const target = el.matches('summary') ? el.closest('.j-node[data-qp-path]') : el;
  return target && treeRoot.contains(target) ? target : null;
}

function wireJsonCopyMenu(host, treeRoot, data) {
  const menu = document.createElement('div');
  menu.className = 'json-copy-menu';
  menu.hidden = true;
  menu.innerHTML = '<button type="button" data-copy="path">Copy JSONPath</button><button type="button" data-copy="key">Copy key/path</button><button type="button" data-copy="value">Copy value</button>';
  host.appendChild(menu);
  let active = null;

  const hide = () => { menu.hidden = true; active = null; };
  const showToast = (message) => {
    host.querySelector('.json-copy-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'json-copy-toast';
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 1300);
  };
  const writeClipboard = async (text) => {
    host.dataset.lastJsonCopy = text;
    try { await navigator.clipboard?.writeText(text); }
    catch { /* secure-context clipboard can be unavailable; keep in-view status */ }
    showToast('Copied');
  };

  treeRoot.addEventListener('contextmenu', (e) => {
    const target = nearestCopyTarget(e.target, treeRoot);
    if (!target) return;
    e.preventDefault();
    active = target;
    const keyBtn = menu.querySelector('[data-copy="key"]');
    keyBtn.textContent = target.dataset.jsonKey ? 'Copy key' : 'Copy path';
    menu.hidden = false;
    const x = Math.min(e.clientX, window.innerWidth - menu.offsetWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 8);
    menu.style.left = Math.max(8, x) + 'px';
    menu.style.top = Math.max(8, y) + 'px';
  });

  menu.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-copy]');
    if (!btn || !active) return;
    const path = active.dataset.qpPath || '';
    const kind = btn.dataset.copy;
    const text = kind === 'path'
      ? active.dataset.jsonPath
      : kind === 'key'
        ? (active.dataset.jsonKey || path || '$')
        : copyTextForValue(data, path, active.dataset.jsonRedacted === '1');
    hide();
    await writeClipboard(text == null ? '' : String(text));
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

function findKeyLine(text, key, fallback = 1) {
  const re = new RegExp(`"${escapeRegExp(key)}"\\s*:`);
  const lines = String(text || '').split(/\r?\n/);
  const idx = lines.findIndex((line) => re.test(line));
  return idx >= 0 ? idx + 1 : fallback;
}

function collectSecrets(value, text, path = '', key = '', out = new Map(), issues = []) {
  if (Array.isArray(value)) {
    value.forEach((item, idx) => collectSecrets(item, text, path ? `${path}.${idx}` : String(idx), key, out, issues));
    return { secrets: out, issues };
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectSecrets(childValue, text, path ? `${path}.${childKey}` : childKey, childKey, out, issues);
    }
    return { secrets: out, issues };
  }
  const masked = maskedValue(key, value);
  if (masked.masked) {
    const line = findKeyLine(text, key);
    out.set(path, { reason: masked.reason, line });
    issues.push({ severity: 'warning', label: 'secret', line, message: `${path || key} looks sensitive and is redacted in the preview.` });
  }
  return { secrets: out, issues };
}

function redactedClone(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => redactedClone(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactedClone(childValue, childKey)]));
  }
  return maskedValue(key, value).masked ? '[configured]' : value;
}

function highlightJsonLine(line) {
  return esc(line)
    .replace(/^(\s*)"([^"]+)"(\s*:)/, `$1<span class="json-src-key">"$2"</span>$3`)
    .replace(/(:\s*)("[^"]*")/, `$1<span class="json-src-string">$2</span>`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function render(intake, ctx) {
  let parsed;
  try {
    parsed = parseJsonLike(intake.text || '', '');
  } catch (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid JSON</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false };
  }
  const sortMode = ['A-Z', 'Z-A'].includes(ctx?.settings?.jsonSortKeys) ? ctx.settings.jsonSortKeys : 'original';
  const warn = parsed.mode === 'jsonc' ? '<div class="json-warning">' + esc(parsed.warnings.join(' ')) + '</div>' : '';
  const { secrets, issues } = collectSecrets(parsed.data, intake.text || '');
  const treeHtml = '<div class="json-tree" data-sort="' + esc(sortMode) + '">' + valueNode(null, parsed.data, sortMode, '', secrets) + '</div>';
  const bodyHtml = warn + treeHtml;

  // Live preview: tree + JSONPath query panel. Static bodyHtml is also returned for screenshots.
  const host = document.createElement('div');
  host.className = 'qp-preview json-qp';
  host.innerHTML = `<style>${JSON_EXTRA_CSS}</style>${bodyHtml}`;
  const treeRoot = host.querySelector('.json-tree');
  wireJsonCopyMenu(host, treeRoot, parsed.data);
  const panel = createQueryPanel({
    placeholder: "JSONPath… e.g. $..name  or  items[*].id",
    hint: 'JSONPath: $.a.b · $..key (recursive) · $.arr[*] · bare key',
    root: treeRoot,
    filterUnit: '.j-node, .j-row',
    evaluate(query) {
      let results;
      try { results = jsonPathQuery(parsed.data, query); }
      catch (e) { return { error: e.message || 'bad query' }; }
      const set = new Set();
      for (const r of results) {
        const sel = '[data-qp-path="' + (window.CSS ? CSS.escape(r.path) : r.path) + '"]';
        const node = treeRoot.querySelector(sel);
        if (node) set.add(node);
      }
      return set;
    },
  });
  host.prepend(panel.el);
  if (issues.length) {
    ensureKnownUiStyle(document);
    const review = issueList(issues, { title: 'JSON Structure Review' });
    if (review) host.appendChild(review);
    host.appendChild(sourcePreview(JSON.stringify(redactedClone(parsed.data), null, 2), {
      title: 'Redacted source',
      collapsed: true,
      idPrefix: 'json-line',
      highlighter: highlightJsonLine,
    }));
    wireSourceLinks(host, { idPrefix: 'json-line' });
  }

  return { parentNode: host, bodyHtml, hadUnsafe: false };
}
