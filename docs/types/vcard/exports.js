// vCard exports: flatten the parsed contacts to a CSV spreadsheet (one row per contact) or JSON.
import { downloadBlob } from '../../core/exports.js';
import { parseVCards } from './vcardlib.js';

const COLS = ['Name', 'Org', 'Title', 'Email', 'Phone', 'URL', 'Address', 'Birthday', 'Note'];
const cell = (s) => { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

function toRow(c) {
  return {
    Name: c.fn, Org: c.org, Title: c.title,
    Email: c.emails.map((e) => e.value).join('; '),
    Phone: c.tels.map((t) => t.value).join('; '),
    URL: c.urls.join('; '),
    Address: c.adrs.map((a) => a.value).join('; '),
    Birthday: c.bday, Note: c.note,
  };
}

export function getExports(intake) {
  const base = (intake.filename || 'contacts').replace(/\.[^.]+$/, '');
  const cards = parseVCards(intake.text || '');
  const rows = cards.map(toRow);
  const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
  return [
    { label: 'Download contacts as CSV', run: () => downloadBlob(csv, base + '.csv', 'text/csv') },
    { label: 'Download contacts as JSON', run: () => downloadBlob(JSON.stringify(rows, null, 2), base + '.json', 'application/json') },
  ];
}
