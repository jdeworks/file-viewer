import { parseCsv } from './renderer.js';

export async function extract(intake) {
  const { rows, delimiter } = await parseCsv(intake);
  const cols = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);
  const empty = rows.reduce((n, r) => n + (r || []).filter((c) => c == null || String(c).trim() === '').length, 0);
  const ragged = rows.filter((r) => (r || []).length !== cols).length;
  const dname = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[delimiter] || delimiter;
  const out = [
    { label: 'Rows', value: String(rows.length) },
    { label: 'Columns', value: String(cols) },
    { label: 'Delimiter', value: dname },
    { label: 'Empty cells', value: String(empty) },
  ];
  if (ragged) out.push({ label: 'Ragged rows', value: String(ragged) });
  if (rows.length && rows[0]) out.push({ label: 'Header fields', value: String(rows[0].filter((c) => String(c || '').trim()).length) });
  return out;
}
