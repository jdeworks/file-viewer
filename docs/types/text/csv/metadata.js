import { parseCsv } from './renderer.js';

export async function extract(intake) {
  const { rows, delimiter } = await parseCsv(intake);
  const cols = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);
  const dname = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[delimiter] || delimiter;
  return [
    { label: 'Rows', value: String(rows.length) },
    { label: 'Columns', value: String(cols) },
    { label: 'Delimiter', value: dname },
  ];
}
