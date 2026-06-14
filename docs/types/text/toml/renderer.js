// TOML preview: parse with the hand-rolled parser, render the value as a collapsible tree
// (reuses the JSON tree styling). Parse errors surface clearly.
import { parseTOML } from './toml.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function valueNode(key, val) {
  const keyHtml = key !== null ? '<span class="j-key">' + esc(key) + '</span>: ' : '';
  if (val === null || val === undefined) return '<div class="j-row">' + keyHtml + '<span class="j-null">null</span></div>';
  if (val instanceof Date) return '<div class="j-row">' + keyHtml + '<span class="j-str">' + esc(val.toISOString()) + '</span></div>';
  const t = typeof val;
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
  let data;
  try { data = parseTOML(intake.text || ''); }
  catch (err) { return { bodyHtml: '<div class="json-error"><strong>Invalid TOML</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false }; }
  return { bodyHtml: '<div class="json-tree">' + valueNode(null, data) + '</div>', hadUnsafe: false };
}
