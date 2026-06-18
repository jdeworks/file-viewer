// JSON preview: a collapsible tree (scriptless, via <details>/<summary>). Parse errors
// surface a clear message with the position. Editable text, so raw + diff still apply.
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function entriesFor(val, sortMode) {
  if (Array.isArray(val)) return val.map((v, i) => [i, v]);
  const entries = Object.entries(val);
  if (sortMode === 'A-Z') return entries.sort(([a], [b]) => a.localeCompare(b));
  if (sortMode === 'Z-A') return entries.sort(([a], [b]) => b.localeCompare(a));
  return entries;
}

function valueNode(key, val, sortMode) {
  const keyHtml = key !== null ? '<span class="j-key">' + esc(key) + '</span>: ' : '';
  if (val === null) return '<div class="j-row">' + keyHtml + '<span class="j-null">null</span></div>';
  const t = typeof val;
  if (t === 'object') {
    const isArr = Array.isArray(val);
    const entries = entriesFor(val, sortMode);
    const open = isArr ? '[' : '{', close = isArr ? ']' : '}';
    const count = entries.length;
    if (!count) return '<div class="j-row">' + keyHtml + '<span class="j-punc">' + open + close + '</span></div>';
    const children = entries.map(([k, v]) => valueNode(isArr ? null : k, v, sortMode)).join('');
    return '<details class="j-node" open><summary>' + keyHtml
      + '<span class="j-punc">' + open + '</span><span class="j-count">' + count + (isArr ? ' items' : ' keys') + '</span></summary>'
      + '<div class="j-children">' + children + '</div><div class="j-row j-close">' + close + '</div></details>';
  }
  const cls = t === 'number' ? 'j-num' : t === 'boolean' ? 'j-bool' : 'j-str';
  const disp = t === 'string' ? '"' + esc(val) + '"' : esc(String(val));
  return '<div class="j-row">' + keyHtml + '<span class="' + cls + '">' + disp + '</span></div>';
}

export async function render(intake, ctx) {
  let data;
  try {
    data = JSON.parse(intake.text || '');
  } catch (err) {
    return { bodyHtml: '<div class="json-error"><strong>Invalid JSON</strong><br>' + esc(err.message) + '</div>', hadUnsafe: false };
  }
  const sortMode = ['A-Z', 'Z-A'].includes(ctx?.settings?.jsonSortKeys) ? ctx.settings.jsonSortKeys : 'original';
  return { bodyHtml: '<div class="json-tree" data-sort="' + esc(sortMode) + '">' + valueNode(null, data, sortMode) + '</div>', hadUnsafe: false };
}
