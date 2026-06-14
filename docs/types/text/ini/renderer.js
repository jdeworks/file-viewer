// INI / .env / .properties preview: parse into [section] → key/value pairs and render grouped
// key-value tables. Tolerant of `=` and `:` separators, `#`/`;` comments, and quoted values.
// Markup lives in sibling .html templates (section/row) and is filled via core/template.js —
// values go through the {{slot}} interpolator's HTML escaping (keys/values are untrusted).
import { loadTemplate, fill, esc, fillEach } from '../../../core/template.js';

const SECTION = new URL('./section.html', import.meta.url);
const ROW = new URL('./row.html', import.meta.url);

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
  const [sectionTpl, rowTpl] = await Promise.all([loadTemplate(SECTION), loadTemplate(ROW)]);
  const body = sections.map((s) => {
    const rows = fillEach(rowTpl, s.pairs, (p) => ({ key: p.key, val: p.value }));
    const head = s.name ? '<h3>[' + esc(s.name) + ']</h3>' : '';
    return fill(sectionTpl, { head, rows });
  }).join('');
  return { bodyHtml: body, hadUnsafe: false };
}
