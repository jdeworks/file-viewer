// Shared query / filter panel for structured tree+table previews (xml, json, jsonl).
// Zero-dependency: each host type supplies an `evaluate(query)` that returns a Set of
// matching elements (live DOM nodes inside the preview), and the panel handles the UI,
// highlighting, match-count, and filter (hide non-matching) toggle.
//
// Usage:
//   const panel = createQueryPanel({
//     placeholder: 'XPath… e.g. //book[@id]',
//     hint: 'Native document.evaluate() XPath',
//     root,                         // the live element holding the tree/table to filter
//     evaluate(query) { return Set<Element> | { error: string } },
//     filterUnit: '.j-node, .j-row' // selector whose elements get hidden when filtering
//   });
//   container.prepend(panel.el);
//
// The panel marks matches with `.qp-match` (highlight) and, in filter mode, hides every
// `filterUnit` that neither matches nor contains a match (`.qp-hidden`).

const HL_CLASS = 'qp-match';
const HIDE_CLASS = 'qp-hidden';

export function createQueryPanel(opts) {
  const { placeholder = 'Query…', hint = '', root, evaluate, filterUnit } = opts;

  const el = document.createElement('div');
  el.className = 'qp-panel';

  const bar = document.createElement('div');
  bar.className = 'qp-bar';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'qp-input';
  input.placeholder = placeholder;
  input.spellcheck = false;
  input.setAttribute('aria-label', placeholder);

  const runBtn = document.createElement('button');
  runBtn.type = 'button';
  runBtn.className = 'qp-btn';
  runBtn.textContent = 'Find';

  const filterLabel = document.createElement('label');
  filterLabel.className = 'qp-filter';
  const filterCb = document.createElement('input');
  filterCb.type = 'checkbox';
  filterLabel.append(filterCb, document.createTextNode(' Filter'));

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'qp-btn qp-clear';
  clearBtn.textContent = 'Clear';

  const status = document.createElement('span');
  status.className = 'qp-status';

  bar.append(input, runBtn, filterLabel, clearBtn, status);
  el.append(bar);
  if (hint) {
    const hintEl = document.createElement('div');
    hintEl.className = 'qp-hint';
    hintEl.textContent = hint;
    el.append(hintEl);
  }

  function clearMarks() {
    for (const m of root.querySelectorAll('.' + HL_CLASS)) m.classList.remove(HL_CLASS);
    for (const h of root.querySelectorAll('.' + HIDE_CLASS)) h.classList.remove(HIDE_CLASS);
  }

  function applyFilter(matches) {
    if (!filterUnit) return;
    const units = root.querySelectorAll(filterUnit);
    for (const u of units) {
      // Keep a unit visible if it is a match or contains/ancestors a match.
      let keep = false;
      for (const m of matches) {
        if (u === m || u.contains(m) || m.contains(u)) { keep = true; break; }
      }
      u.classList.toggle(HIDE_CLASS, !keep);
    }
  }

  function run() {
    clearMarks();
    status.classList.remove('qp-status-err');
    const q = input.value.trim();
    if (!q) { status.textContent = ''; return; }
    let result;
    try { result = evaluate(q); } catch (e) { result = { error: e.message || String(e) }; }
    if (result && result.error) {
      status.textContent = '⚠ ' + result.error;
      status.classList.add('qp-status-err');
      return;
    }
    const matches = result instanceof Set ? [...result] : (Array.isArray(result) ? result : []);
    const valid = matches.filter((m) => m && m.classList);
    for (const m of valid) m.classList.add(HL_CLASS);
    status.textContent = valid.length + ' match' + (valid.length === 1 ? '' : 'es');
    if (filterCb.checked) applyFilter(valid);
    // Scroll the first match into view.
    valid[0]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  runBtn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  filterCb.addEventListener('change', run);
  clearBtn.addEventListener('click', () => { input.value = ''; clearMarks(); status.textContent = ''; });

  return { el, run, clear: () => { clearMarks(); status.textContent = ''; }, input };
}

// ── JSONPath-lite ───────────────────────────────────────────────────────────────
// A tiny property-path / filter matcher for JSON & JSONL trees. Supports:
//   $.a.b           dot path from root
//   $.a[0].b        array index
//   $..key          recursive descent to any key named `key`
//   $.items[*].id   wildcard over array/object members
//   key             bare key (implicit recursive search)
// Returns an array of { path, value } for every node whose path matches.
export function jsonPathQuery(data, query) {
  const q = query.trim();
  if (!q) return [];
  // Bare word (no $/./[): treat as recursive key search.
  const isBare = !/[.$[\]]/.test(q);
  const path = isBare ? ['..', q] : tokenize(q);
  const out = [];
  walk(data, path, 0, [], out);
  return out;
}

function tokenize(q) {
  // Normalize [n]/[*]/['k'] bracket access into dot segments, then split into a token list
  // where a literal ".." (recursive descent) becomes the marker token '..'.
  let s = q.startsWith('$') ? q.slice(1) : q;
  s = s.replace(/\[(\*|\d+|'[^']*'|"[^"]*")\]/g, (_, k) => {
    const key = k === '*' ? '*' : k.replace(/^['"]|['"]$/g, '');
    return '.' + key;
  });
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '.') {
      if (s[i + 1] === '.') { tokens.push('..'); i += 2; continue; }   // recursive descent
      i += 1; continue;                                                // ordinary separator
    }
    let j = i;
    while (j < s.length && s[j] !== '.') j++;
    tokens.push(s.slice(i, j));
    i = j;
  }
  // A leading ".." (from "$..key") stays; a leading "" never occurs here.
  return tokens.filter((t) => t !== '');
}

function walk(node, tokens, ti, path, out) {
  if (ti >= tokens.length) { out.push({ path: path.join('.'), value: node }); return; }
  const tok = tokens[ti];
  if (tok === '..') {
    const next = tokens[ti + 1];
    // Recursive descent: match `next` at any depth.
    descend(node, next, path, (n, p) => walk(n, tokens, ti + 2, p, out));
    return;
  }
  if (node == null || typeof node !== 'object') return;
  if (tok === '*') {
    const entries = Array.isArray(node) ? node.map((v, i) => [i, v]) : Object.entries(node);
    for (const [k, v] of entries) walk(v, tokens, ti + 1, path.concat(String(k)), out);
    return;
  }
  if (Array.isArray(node)) {
    const idx = Number(tok);
    if (Number.isInteger(idx) && idx >= 0 && idx < node.length) walk(node[idx], tokens, ti + 1, path.concat(tok), out);
    return;
  }
  if (Object.prototype.hasOwnProperty.call(node, tok)) walk(node[tok], tokens, ti + 1, path.concat(tok), out);
}

function descend(node, key, path, hit) {
  if (node == null || typeof node !== 'object') return;
  const entries = Array.isArray(node) ? node.map((v, i) => [i, v]) : Object.entries(node);
  for (const [k, v] of entries) {
    const p = path.concat(String(k));
    if (key === '*' || String(k) === key) hit(v, p);
    descend(v, key, p, hit);
  }
}
