// XML preview: parse with the platform DOMParser and render a collapsible element tree
// (reusing the JSON tree styling). Attributes and text are shown inline. No code execution —
// XML isn't script. Structural diff is provided separately via loadDiffRenderer.
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

function elNode(el) {
  const tag = '<span class="j-key">&lt;' + esc(el.tagName) + '&gt;</span>';
  const kids = [...el.children];
  const text = directText(el);
  if (!kids.length) {
    return '<div class="j-row">' + tag + attrHtml(el) + (text ? ' <span class="j-str">' + esc(text) + '</span>' : '') + '</div>';
  }
  const children = kids.map(elNode).join('')
    + (text ? '<div class="j-row"><span class="j-str">' + esc(text) + '</span></div>' : '');
  return '<details class="j-node" open><summary>' + tag + attrHtml(el)
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
  return { bodyHtml: '<div class="json-tree">' + elNode(root) + '</div>', hadUnsafe: false };
}
