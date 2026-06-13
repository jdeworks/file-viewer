// Generic structural tree diff. Compares two trees by STRUCTURE (keyed children) rather than as
// text, so reordering/reformatting doesn't read as a change. The shape of "a tree" is supplied
// by an ADAPTER, so the same engine powers the JSON key-diff and the HTML/XML DOM diff (and any
// future tree format). Heuristic and linear-ish — children are matched by an adapter-provided
// key, NOT by expensive tree-edit-distance.
//
// Adapter interface:
//   isContainer(node)        → true if node has keyed children (vs a leaf value)
//   kindOf(node)             → a string kind; a kind change marks the node 'changed'
//   childKeys(a, b)          → ordered list of keys to compare (both are same-kind containers)
//   getChild(node, key)      → the child for key, or ABSENT
//   leafEqual(a, b)          → leaf equality
//   name(node)               → optional display name stored on container nodes
//
// Produces a node tree: { key, status:'added'|'removed'|'changed'|'unchanged', kind,
//   children?, counts?, value?, oldValue?, name? } — rendered by renderTreeDiff (or a custom one).

export const ABSENT = Symbol('absent');

export function aggregate(children) {
  const c = { added: 0, removed: 0, changed: 0 };
  for (const ch of children) {
    if (ch.status === 'added') c.added++;
    else if (ch.status === 'removed') c.removed++;
    else if (ch.status === 'changed') c.changed++;
    if (ch.children) { c.added += ch.counts.added; c.removed += ch.counts.removed; c.changed += ch.counts.changed; }
  }
  return c;
}

function diffNode(key, a, b, ad) {
  if (a === ABSENT) return { key, status: 'added', kind: ad.kindOf(b), value: b };
  if (b === ABSENT) return { key, status: 'removed', kind: ad.kindOf(a), value: a };

  const ca = ad.isContainer(a), cb = ad.isContainer(b);
  const ka = ad.kindOf(a), kb = ad.kindOf(b);
  if (ca !== cb || ka !== kb) return { key, status: 'changed', kind: kb, oldValue: a, value: b };

  if (ca) {
    const keys = ad.childKeys(a, b);
    const children = keys.map((k) => diffNode(k, ad.getChild(a, k), ad.getChild(b, k), ad));
    const counts = aggregate(children);
    return {
      key, kind: kb, children, counts, name: ad.name ? ad.name(b) : undefined,
      status: counts.added + counts.removed + counts.changed ? 'changed' : 'unchanged',
    };
  }
  return ad.leafEqual(a, b)
    ? { key, status: 'unchanged', kind: kb, value: b }
    : { key, status: 'changed', kind: kb, oldValue: a, value: b };
}

export function treeDiff(a, b, adapter) {
  const root = diffNode(null, a, b, adapter);
  return { root, counts: root.children ? root.counts : aggregate([root]) };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Generic collapsible-tree renderer. Reuses the JSON-diff CSS classes (jd-*) for a consistent
// look. opts: { keyLabel(node), containerLabel(node), leafHtml(node) } — all return HTML strings.
function nodeHtml(node, isRoot, opts) {
  const keyHtml = node.key === null || node.key === undefined ? '' : '<span class="jd-key">' + opts.keyLabel(node) + '</span>: ';
  const cls = 'jd-node jd-' + node.status;
  if (node.children) {
    const badge = node.status !== 'unchanged'
      ? '<span class="jd-badge">' + [node.counts.added && '+' + node.counts.added, node.counts.removed && '−' + node.counts.removed, node.counts.changed && '~' + node.counts.changed].filter(Boolean).join(' ') + '</span>'
      : '';
    const open = node.status !== 'unchanged' || isRoot ? ' open' : '';
    const kids = node.children.map((c) => nodeHtml(c, false, opts)).join('');
    return '<details class="' + cls + '"' + open + '><summary>' + keyHtml
      + opts.containerLabel(node) + badge + '</summary>'
      + '<div class="jd-children">' + kids + '</div></details>';
  }
  let val;
  if (node.status === 'changed' && node.oldValue !== undefined) val = '<span class="jd-old">' + opts.leafHtml({ ...node, value: node.oldValue }) + '</span> → ' + opts.leafHtml(node);
  else val = opts.leafHtml(node);
  return '<div class="' + cls + '">' + keyHtml + val + '</div>';
}

export function renderTreeDiff(host, result, opts) {
  const c = result.counts;
  const clean = !(c.added + c.removed + c.changed);
  const summary = clean ? (opts.cleanText || 'No structural differences.')
    : c.added + ' added · ' + c.removed + ' removed · ' + c.changed + ' changed';
  host.innerHTML = '<div class="jsondiff"><div class="jd-head"><strong>' + esc(opts.heading || 'Structural diff') + '</strong> — ' + esc(summary)
    + (opts.note ? '<span class="jd-note">' + esc(opts.note) + '</span>' : '')
    + '</div><div class="jd-tree">' + nodeHtml(result.root, true, opts) + '</div></div>';
}

export { esc as escapeTreeText };
