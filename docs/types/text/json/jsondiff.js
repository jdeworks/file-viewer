// Semantic JSON diff: compares two JSON documents by KEY/PATH rather than as text, so
// reordered keys and reformatting don't read as changes. Object keys are matched by name
// (and sorted in the output); arrays are compared by index. Renders a collapsible tree
// where each node is tagged unchanged / added / removed / changed. Pure client-side.
//
// The diff ENGINE is the shared generic core (core/treediff.js); this file only supplies the
// JSON adapter + JSON-flavoured rendering.
import { treeDiff, ABSENT } from '../../../core/treediff.js';

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// JSON tree adapter: objects are containers keyed by (sorted) property name; arrays by index.
const jsonAdapter = {
  isContainer: (v) => { const t = typeOf(v); return t === 'object' || t === 'array'; },
  kindOf: typeOf,
  childKeys: (a, b) => {
    if (typeOf(a) === 'array') { const n = Math.max(a.length, b.length); return Array.from({ length: n }, (_, i) => i); }
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  },
  getChild: (node, key) => {
    if (Array.isArray(node)) return key < node.length ? node[key] : ABSENT;
    return key in node ? node[key] : ABSENT;
  },
  leafEqual: (a, b) => a === b,
};

export function diffJson(aText, bText) {
  let a, b;
  try { a = JSON.parse(aText || 'null'); } catch (e) { return { error: 'Original is not valid JSON: ' + e.message }; }
  try { b = JSON.parse(bText || 'null'); } catch (e) { return { error: 'Current is not valid JSON: ' + e.message }; }
  return treeDiff(a, b, jsonAdapter);
}

const fmtVal = (v) => {
  const t = typeOf(v);
  if (t === 'string') return '<span class="jd-str">"' + esc(v) + '"</span>';
  if (t === 'number') return '<span class="jd-num">' + esc(v) + '</span>';
  if (t === 'boolean') return '<span class="jd-bool">' + esc(v) + '</span>';
  if (t === 'null') return '<span class="jd-null">null</span>';
  if (t === 'array') return '<span class="jd-punc">[' + v.length + ']</span>';
  return '<span class="jd-punc">{' + Object.keys(v).length + '}</span>';
};

function nodeHtml(node, isRoot) {
  const keyHtml = node.key === null ? '' : '<span class="jd-key">' + esc(node.key) + '</span>: ';
  const cls = 'jd-node jd-' + node.status;
  if (node.children) {
    const badge = node.status !== 'unchanged'
      ? '<span class="jd-badge">' + [node.counts.added && '+' + node.counts.added, node.counts.removed && '−' + node.counts.removed, node.counts.changed && '~' + node.counts.changed].filter(Boolean).join(' ') + '</span>'
      : '';
    const open = node.status !== 'unchanged' || isRoot ? ' open' : '';
    const kids = node.children.map((c) => nodeHtml(c, false)).join('');
    return '<details class="' + cls + '"' + open + '><summary>' + keyHtml
      + '<span class="jd-punc">' + (node.kind === 'array' ? '[ ]' : '{ }') + '</span>' + badge + '</summary>'
      + '<div class="jd-children">' + kids + '</div></details>';
  }
  let val;
  if (node.status === 'changed') val = '<span class="jd-old">' + fmtVal(node.oldValue) + '</span> → ' + fmtVal(node.value);
  else val = fmtVal(node.value);
  return '<div class="' + cls + '">' + keyHtml + val + '</div>';
}

// Diff-renderer contract used by core (Layer 2): render(host, originalText, currentText).
export const render = (host, aText, bText) => renderJsonDiff(host, aText, bText);

export function renderJsonDiff(host, aText, bText) {
  const d = diffJson(aText, bText);
  if (d.error) { host.innerHTML = '<div class="jsondiff"><p class="jd-error">' + esc(d.error) + '</p></div>'; return; }
  const c = d.counts;
  const clean = !(c.added + c.removed + c.changed);
  const summary = clean ? 'No structural differences (keys may have been reordered/reformatted).'
    : c.added + ' added · ' + c.removed + ' removed · ' + c.changed + ' changed';
  host.innerHTML = '<div class="jsondiff"><div class="jd-head"><strong>JSON key diff</strong> — ' + esc(summary)
    + '<span class="jd-note">Compared by key/path (keys sorted); reordering and formatting are ignored.</span></div>'
    + '<div class="jd-tree">' + nodeHtml(d.root, true) + '</div></div>';
}
