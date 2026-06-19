import { parseCsv } from './renderer.js';
import { META_KEYS, textFact, typeFact } from '../../../core/metadata-helpers.js';

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
    typeFact('Rows', String(rows.length)),
    typeFact('Columns', String(cols)),
    typeFact('Delimiter', dname),
    textFact('Line endings', raw.lineEndings, META_KEYS.lineEndings, 0),
    textFact('Physical lines', String(raw.physicalLines)),
    textFact('Blank physical lines', String(raw.blankPhysicalLines)),
    textFact('Trailing newline', raw.trailingNewline ? 'yes' : 'no', META_KEYS.trailingNewline, 0),
    typeFact('Quoted fields', raw.quotedFieldsLikely ? 'yes' : 'no'),
    typeFact('Empty cells', String(empty)),
  ];
  if (ragged) out.push(typeFact('Ragged rows', String(ragged)));
  if (rows.length && rows[0]) out.push(typeFact('Header fields', String(rows[0].filter((c) => String(c || '').trim()).length)));
  return out;
}

export const testExports = { rawCsvStats };
