// Shared structural DOM diff, built on the generic tree engine (treediff.js). Both HTML and XML
// use it — only the parser differs. Elements are matched by tag(+#id)+ordinal, attributes are
// `@name` leaves, and an element's direct text is a `#text` leaf (whitespace-normalized), so
// reindenting / attribute reordering doesn't read as a change.
import { treeDiff, renderTreeDiff, ABSENT, escapeTreeText as esc } from './treediff.js';

const NORM = (s) => String(s).replace(/\s+/g, ' ').trim();
const isEl = (n) => !!(n && n.nodeType === 1);

function directText(el) {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return NORM(t);
}

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

// Render a structural diff of two documents into `host`. `parse(text)` must return the root
// element to compare (e.g. document.body for HTML, documentElement for XML).
export function renderDomDiff(host, aText, bText, { parse, heading, note, cleanText }) {
  let a, b;
  try { a = parse(aText); b = parse(bText); }
  catch (e) { host.innerHTML = '<div class="jsondiff"><p class="jd-error">Could not parse: ' + esc(e.message) + '</p></div>'; return; }
  if (!a || !b) { host.innerHTML = '<div class="jsondiff"><p class="jd-error">Empty or unparseable document.</p></div>'; return; }
  const result = treeDiff(a, b, domAdapter);
  renderTreeDiff(host, result, {
    heading, note, cleanText,
    keyLabel: (n) => esc(String(n.key)),
    containerLabel: (n) => '<span class="jd-punc">&lt;' + esc(n.name || 'el') + '&gt;</span>',
    leafHtml,
  });
}
