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
  if (val === null) return '<div class="j-row"' + pathAttr + '>' + keyHtml + '<span class="j-null">null</span></div>';
  const t = typeof val;
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = entriesFor(val, sortMode);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    const count = entries.length;
    if (!count) return '<div class="j-row"' + pathAttr + '>' + keyHtml + '<span class="j-punc">' + open + close + '</span></div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, sortMode, path ? path + '.' + k : String(k), secrets)).join('');
    return '<details class="j-node" open' + pathAttr + '><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + count + (isArr ? ' items' : ' keys') + '</span></summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const secret = secrets.get(path);
  const disp = secret ? `<span class="json-redacted" title="${esc(secret.reason)}">"[configured]"</span>` : (t === 'string' ? '"' + esc(val) + '"' : esc(String(val)));
  if (secret) return '<div class="j-row"' + pathAttr + '>' + keyHtml + disp + '</div>';
  return '<div class="j-row"' + pathAttr + '>' + keyHtml + '<span class="' + cls + '">' + disp + '</span></div>';
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
