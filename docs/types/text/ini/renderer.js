// INI / .env / .properties preview: parse into [section] → key/value pairs and render grouped
// key-value tables. Tolerant of `=` and `:` separators, `#`/`;` comments, and quoted values.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function parseIni(text) {
  const sections = [{ name: null, pairs: [] }];
  let cur = sections[0];
  for (let raw of (text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#' || line[0] === ';') continue;
    const sec = line.match(/^\[(.+?)\]$/);
    if (sec) { cur = { name: sec[1].trim(), pairs: [] }; sections.push(cur); continue; }
    const m = line.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      cur.pairs.push({ key: m[1].trim(), value: val });
    }
  }
  return sections.filter((s) => s.pairs.length || s.name);
}

export async function render(intake, _ctx) {
  const sections = parseIni(intake.text || '');
  if (!sections.length) return { bodyHtml: '<p class="ics-empty">No key-value pairs found.</p>', hadUnsafe: false };
  const body = sections.map((s) => {
    const rows = s.pairs.map((p) => '<tr><td class="kv-key">' + esc(p.key) + '</td><td class="kv-val">' + esc(p.value) + '</td></tr>').join('');
    const head = s.name ? '<h3>[' + esc(s.name) + ']</h3>' : '';
    return '<div class="kv-section">' + head + '<table class="kv-table"><tbody>' + rows + '</tbody></table></div>';
  }).join('');
  return { bodyHtml: body, hadUnsafe: false };
}
