import { parseCsv } from './renderer.js';

function rawCsvStats(text) {
  let crlf = 0, lf = 0, cr = 0, quoted = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c === 34) quoted += 1;
    if (c === 13 && text.charCodeAt(i + 1) === 10) {
      crlf += 1;
      i += 1;
    } else if (c === 10) {
      lf += 1;
    } else if (c === 13) {
      cr += 1;
    }
  }
  const endings = [
    crlf ? 'CRLF' : '',
    lf ? 'LF' : '',
    cr ? 'CR' : '',
  ].filter(Boolean);
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = text ? normalized.split('\n') : [];
  const trailingNewline = parts.length > 0 && parts[parts.length - 1] === '';
  const physicalLines = trailingNewline ? parts.slice(0, -1) : parts;
  return {
    lineEndings: endings.length ? endings.join(' + ') : 'none',
    physicalLines: physicalLines.length,
    blankPhysicalLines: physicalLines.filter((line) => line.trim() === '').length,
    trailingNewline,
    quotedFieldsLikely: quoted >= 2,
  };
}

export async function extract(intake) {
  const { rows, delimiter } = await parseCsv(intake);
  const raw = rawCsvStats(intake.text || '');
  const cols = rows.reduce((m, r) => Math.max(m, (r || []).length), 0);
  const empty = rows.reduce((n, r) => n + (r || []).filter((c) => c == null || String(c).trim() === '').length, 0);
  const ragged = rows.filter((r) => (r || []).length !== cols).length;
  const dname = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' }[delimiter] || delimiter;
  const out = [
    { label: 'Rows', value: String(rows.length) },
    { label: 'Columns', value: String(cols) },
    { label: 'Delimiter', value: dname },
    { label: 'Line endings', value: raw.lineEndings },
    { label: 'Physical lines', value: String(raw.physicalLines) },
    { label: 'Blank physical lines', value: String(raw.blankPhysicalLines) },
    { label: 'Trailing newline', value: raw.trailingNewline ? 'yes' : 'no' },
    { label: 'Quoted fields', value: raw.quotedFieldsLikely ? 'yes' : 'no' },
    { label: 'Empty cells', value: String(empty) },
  ];
  if (ragged) out.push({ label: 'Ragged rows', value: String(ragged) });
  if (rows.length && rows[0]) out.push({ label: 'Header fields', value: String(rows[0].filter((c) => String(c || '').trim()).length) });
  return out;
}

export const testExports = { rawCsvStats };
