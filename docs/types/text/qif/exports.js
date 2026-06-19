// QIF export: convert transactions to CSV.
import { downloadBlob } from '../../../core/exports.js';

function parseQif(text) {
  const transactions = [];
  for (const block of text.split(/\^/)) {
    const lines = block.split(/\r?\n/);
    const t = {};
    for (const line of lines) {
      if (line.startsWith('D')) t.date = line.slice(1).trim();
      else if (line.startsWith('T')) t.amount = line.slice(1).trim();
      else if (line.startsWith('P')) t.payee = line.slice(1).trim();
      else if (line.startsWith('M')) t.memo = line.slice(1).trim();
      else if (line.startsWith('N')) t.number = line.slice(1).trim();
    }
    if (t.date || t.amount) transactions.push(t);
  }
  return transactions;
}

function escCsv(v) {
  const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function rowToCsv(cols) {
  return cols.map(escCsv).join(',');
}

export function getExports(intake) {
  const base = (intake.filename || 'transactions').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Export transactions as CSV',
      run: () => {
        const txns = parseQif(intake.text || '');
        const header = rowToCsv(['Date', 'Amount', 'Payee', 'Memo', 'Number']);
        const rows = txns.map((t) =>
          rowToCsv([t.date || '', t.amount || '', t.payee || '', t.memo || '', t.number || ''])
        );
        const csv = [header, ...rows].join('\r\n') + '\r\n';
        downloadBlob(csv, base + '.csv', 'text/csv');
      },
    },
  ];
}
