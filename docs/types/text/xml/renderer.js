// XML preview: parse with the platform DOMParser and render a collapsible element tree
// (reusing the JSON tree styling). Attributes and text are shown inline. No code execution —
// XML isn't script. Structural diff is provided separately via loadDiffRenderer.
// The live preview also carries an optional XPath query panel (core/query-panel.js) backed by
// the platform's native document.evaluate(); a static bodyHtml is returned alongside for
// screenshots / Print.
import { createQueryPanel } from '../../../core/query-panel.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const NORM = (s) => String(s).replace(/\s+/g, ' ').trim();
function directText(el) {
  let t = '';
  for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
  return NORM(t);
}

function attrHtml(el) {
  return [...el.attributes]
    .map((a) => ' <span class="j-key">' + esc(a.name) + '</span>=<span class="j-str">"' + esc(a.value) + '"</span>')
    .join('');
}

// `idx` is a monotonically-increasing element id assigned in document order; the live element
// nodes get matched back to the rendered rows via data-qp-el for XPath highlighting.
function elNode(el, counter) {
  const myId = counter.n++;
  const idAttr = ' data-qp-el="' + myId + '"';
  el.__qpId = myId;
  const tag = '<span class="j-key">&lt;' + esc(el.tagName) + '&gt;</span>';
  const kids = [...el.children];
  const text = directText(el);
  if (!kids.length) {
    return '<div class="j-row"' + idAttr + '>' + tag + attrHtml(el) + (text ? ' <span class="j-str">' + esc(text) + '</span>' : '') + '</div>';
  }
  const children = kids.map((k) => elNode(k, counter)).join('')
    + (text ? '<div class="j-row"><span class="j-str">' + esc(text) + '</span></div>' : '');
  return '<details class="j-node" open' + idAttr + '><summary>' + tag + attrHtml(el)
    + '<span class="j-count">' + kids.length + (kids.length === 1 ? ' child' : ' children') + '</span></summary>'
    + '<div class="j-children">' + children + '</div></details>';
}

export async function render(intake, _ctx) {
  const doc = new DOMParser().parseFromString(intake.text || '', 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid XML</strong><br>' + esc(err.textContent.slice(0, 300)) + '</div>', hadUnsafe: false };
  }
  const root = doc.documentElement;
  if (!root) return { bodyHtml: '<div class="json-tree"><div class="j-row"><span class="j-null">empty document</span></div></div>', hadUnsafe: false };
  const counter = { n: 0 };
  const treeHtml = '<div class="json-tree">' + elNode(root, counter) + '</div>';

  // Live preview: tree + XPath query panel. doc.__qpId tags map evaluated nodes → rendered rows.
  const host = document.createElement('div');
  host.className = 'qp-preview xml-qp';
  host.innerHTML = treeHtml;
  const treeRoot = host.querySelector('.json-tree');
  const panel = createQueryPanel({
    placeholder: 'XPath… e.g. //book[@id]  or  //title',
    hint: 'XPath via native document.evaluate() — e.g. //tag, //*[@attr], /root/child',
    root: treeRoot,
    filterUnit: '.j-node, .j-row',
    evaluate(query) {
      let res;
      try { res = doc.evaluate(query, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null); }
      catch (e) { return { error: e.message || 'bad XPath' }; }
      const set = new Set();
      for (let i = 0; i < res.snapshotLength; i++) {
        let node = res.snapshotItem(i);
        // Map attribute/text/comment nodes up to their owning element.
        while (node && node.nodeType !== 1 && node.ownerElement) node = node.ownerElement;
        while (node && node.nodeType !== 1 && node.parentNode) node = node.parentNode;
        if (!node || node.__qpId === undefined) continue;
        const row = treeRoot.querySelector('[data-qp-el="' + node.__qpId + '"]');
        if (row) set.add(row);
      }
      return set;
    },
  });
  host.prepend(panel.el);

  return { parentNode: host, bodyHtml: treeHtml, hadUnsafe: false };
}
