// Semantic JSON diff: compares two JSON documents by KEY/PATH rather than as text, so
// reordered keys and reformatting don't read as changes. Object keys are matched by name
// (and sorted in the output); arrays are compared by index. Renders a collapsible tree
// where each node is tagged unchanged / added / removed / changed. Pure client-side.

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ABSENT = Symbol('absent');

function aggregate(children) {
  const c = { added: 0, removed: 0, changed: 0 };
  for (const ch of children) {
    if (ch.status === 'added') c.added++;
    else if (ch.status === 'removed') c.removed++;
    else if (ch.status === 'changed') c.changed++;
    if (ch.children) { c.added += ch.counts.added; c.removed += ch.counts.removed; c.changed += ch.counts.changed; }
  }
  return c;
}

// Build a diff node for key `key` comparing a vs b (either may be ABSENT).
function diffNode(key, a, b) {
  if (a === ABSENT) return { key, status: 'added', kind: typeOf(b), value: b };
  if (b === ABSENT) return { key, status: 'removed', kind: typeOf(a), value: a };

  const ta = typeOf(a), tb = typeOf(b);
  if (ta !== tb) return { key, status: 'changed', kind: tb, oldValue: a, value: b };

  if (ta === 'object') {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const children = keys.map((k) => diffNode(k, k in a ? a[k] : ABSENT, k in b ? b[k] : ABSENT));
    const counts = aggregate(children);
    return { key, status: counts.added + counts.removed + counts.changed ? 'changed' : 'unchanged', kind: 'object', children, counts };
  }
  if (ta === 'array') {
    const n = Math.max(a.length, b.length);
    const children = [];
    for (let i = 0; i < n; i++) children.push(diffNode(i, i < a.length ? a[i] : ABSENT, i < b.length ? b[i] : ABSENT));
    const counts = aggregate(children);
    return { key, status: counts.added + counts.removed + counts.changed ? 'changed' : 'unchanged', kind: 'array', children, counts };
  }
  // primitives
  return a === b
    ? { key, status: 'unchanged', kind: ta, value: b }
    : { key, status: 'changed', kind: ta, oldValue: a, value: b };
}

export function diffJson(aText, bText) {
  let a, b;
  try { a = JSON.parse(aText || 'null'); } catch (e) { return { error: 'Original is not valid JSON: ' + e.message }; }
  try { b = JSON.parse(bText || 'null'); } catch (e) { return { error: 'Current is not valid JSON: ' + e.message }; }
  const root = diffNode(null, a, b);
  return { root, counts: root.children ? root.counts : aggregate([root]) };
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
