// YAML preview: parse with vendored js-yaml, render the resulting value as a collapsible
// tree (reusing the JSON tree styling). Supports multi-document streams (---). Parse errors
// surface clearly. js-yaml's safe load (no custom types) — no code execution.
import { loadGlobal, vendor } from '../../core/script-loader.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function valueNode(key, val) {
  const keyHtml = key !== null ? '<span class="j-key">' + esc(key) + '</span>: ' : '';
  if (val === null || val === undefined) return '<div class="j-row">' + keyHtml + '<span class="j-null">null</span></div>';
  const t = typeof val;
  if (val instanceof Date) return '<div class="j-row">' + keyHtml + '<span class="j-str">' + esc(val.toISOString()) + '</span></div>';
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    if (!entries.length) return '<div class="j-row">' + keyHtml + '<span class="j-punc">' + open + close + '</span></div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v)).join('');
    return '<details class="j-node" open><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + entries.length + (isArr ? ' items' : ' keys') + '</span></summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const disp = t === 'string' ? '"' + esc(val) + '"' : esc(String(val));
  return '<div class="j-row">' + keyHtml + '<span class="' + cls + '">' + disp + '</span></div>';
}

export async function render(intake, _ctx) {
  const jsyaml = await loadGlobal(vendor('js-yaml/js-yaml.min.js'), 'jsyaml');
  let docs;
  try {
    docs = jsyaml.loadAll(intake.text || '');
  } catch (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid YAML</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false };
  }
  if (!docs.length || (docs.length === 1 && docs[0] === undefined)) {
    return { bodyHtml: '<div class="json-tree"><div class="j-row"><span class="j-null">empty document</span></div></div>', hadUnsafe: false };
  }
  const body = docs.map((d, i) => {
    const head = docs.length > 1 ? '<div class="yaml-doc-sep">document ' + (i + 1) + '</div>' : '';
    return head + valueNode(null, d);
  }).join('');
  return { bodyHtml: '<div class="json-tree">' + body + '</div>', hadUnsafe: false };
}
