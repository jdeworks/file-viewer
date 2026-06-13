// Structural HTML diff (Layer-2 custom diff). Compares two documents by their DOM structure —
// elements (matched by tag + id + ordinal), attributes, and text — rather than as raw text, so
// reindenting or reordering attributes doesn't read as a change. Built on the shared generic
// engine (core/treediff.js) with a DOM adapter; XML can reuse the same adapter later.
import { treeDiff, renderTreeDiff, ABSENT, escapeTreeText as esc } from '../../core/treediff.js';

const NORM = (s) => String(s).replace(/\s+/g, ' ').trim();

function parseBody(text) {
  const doc = new DOMParser().parseFromString(text || '', 'text/html');
  return doc.body || doc.documentElement;
}

// Concatenated direct text of an element (not descendants).
function directText(el) {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return NORM(t);
}

// Keyed children of an element: attributes (@name, sorted) + one #text leaf + child elements
// keyed by tag(+#id) with an ordinal to disambiguate repeats. Memoized per node.
const cache = new WeakMap();
function keyed(el) {
  if (cache.has(el)) return cache.get(el);
  const m = new Map();
  for (const name of [...el.attributes].map((a) => a.name).sort()) m.set('@' + name, el.getAttribute(name));
  const txt = directText(el);
  if (txt) m.set('#text', txt);
  const counts = {};
  for (const ch of el.children) {
    const base = ch.tagName.toLowerCase() + (ch.id ? '#' + ch.id : '');
    const n = (counts[base] = (counts[base] || 0) + 1);
    m.set(n === 1 ? base : base + ':' + n, ch);
  }
  cache.set(el, m);
  return m;
}

const isEl = (n) => !!(n && n.nodeType === 1);

const domAdapter = {
  isContainer: isEl,
  kindOf: (n) => (isEl(n) ? 'element' : 'text'),
  childKeys: (a, b) => {
    const am = keyed(a), bm = keyed(b);
    const out = [...am.keys()];
    for (const k of bm.keys()) if (!am.has(k)) out.push(k);
    return out;
  },
  getChild: (node, key) => { const v = keyed(node).get(key); return v === undefined ? ABSENT : v; },
  leafEqual: (a, b) => NORM(a) === NORM(b),
  name: (n) => (isEl(n) ? n.tagName.toLowerCase() : 'text'),
};

function leafHtml(node) {
  const v = node.value;
  if (isEl(v)) return '<span class="jd-punc">&lt;' + esc(v.tagName.toLowerCase()) + '&gt;…</span>';
  if (v && v.nodeType) return '<span class="jd-str">' + esc(v.textContent || '') + '</span>';
  return '<span class="jd-str">' + esc(String(v)) + '</span>';
}

export function render(host, aText, bText) {
  let a, b;
  try { a = parseBody(aText); b = parseBody(bText); }
  catch (e) { host.innerHTML = '<div class="jsondiff"><p class="jd-error">Could not parse HTML: ' + esc(e.message) + '</p></div>'; return; }
  const result = treeDiff(a, b, domAdapter);
  renderTreeDiff(host, result, {
    heading: 'HTML structural diff',
    note: 'Compared by element/attribute/text structure; whitespace & formatting are ignored.',
    cleanText: 'No structural differences (only whitespace/formatting changed).',
    keyLabel: (n) => esc(String(n.key)),
    containerLabel: (n) => '<span class="jd-punc">&lt;' + esc(n.name || 'el') + '&gt;</span>',
    leafHtml,
  });
}
