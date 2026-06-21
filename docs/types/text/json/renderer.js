// JSON preview: a collapsible tree (scriptless, via <details>/<summary>). Parse errors
// surface a clear message with the position. Editable text, so raw + diff still apply.
// The live preview also carries an optional JSONPath/property query panel (core/query-panel.js)
// that highlights/filters matching nodes; a static bodyHtml is returned alongside so screenshots
// and Print/Save-as-PDF still work.
import { parseJsonLike } from './jsonparse.js';
import { createQueryPanel, jsonPathQuery } from '../../../core/query-panel.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function entriesFor(val, sortMode) {
  if (Array.isArray(val)) return val.map((v, i) => [i, v]);
  const entries = Object.entries(val);
  if (sortMode === 'A-Z') return entries.sort(([a], [b]) => a.localeCompare(b));
  if (sortMode === 'Z-A') return entries.sort(([a], [b]) => b.localeCompare(a));
  return entries;
}

// `path` is the dot-joined JSONPath of this node (used for query→DOM mapping via data-qp-path).
function valueNode(key, val, sortMode, path) {
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
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, sortMode, path ? path + '.' + k : String(k))).join('');
    return '<details class="j-node" open' + pathAttr + '><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + count + (isArr ? ' items' : ' keys') + '</span></summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const disp = t === 'string' ? '"' + esc(val) + '"' : esc(String(val));
  return '<div class="j-row"' + pathAttr + '>' + keyHtml + '<span class="' + cls + '">' + disp + '</span></div>';
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
  const treeHtml = '<div class="json-tree" data-sort="' + esc(sortMode) + '">' + valueNode(null, parsed.data, sortMode, '') + '</div>';
  const bodyHtml = warn + treeHtml;

  // Live preview: tree + JSONPath query panel. Static bodyHtml is also returned for screenshots.
  const host = document.createElement('div');
  host.className = 'qp-preview json-qp';
  host.innerHTML = bodyHtml;
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

  return { parentNode: host, bodyHtml, hadUnsafe: false };
}
