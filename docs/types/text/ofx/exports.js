// OFX/QFX export: convert transactions to CSV. We parse the raw text here to capture all
// transaction fields (Name, Memo, FITID) that the preview renderer folds together.
import { downloadBlob } from '../../../core/exports.js';

function tagVal(src, tag) {
  const m = new RegExp('<' + tag + '>([^<]*)', 'i').exec(src);
  return m ? m[1].trim() : '';
}

function extractBlocks(src, tag) {
  const re = new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

function allTagVals(src, tag) {
  const re = new RegExp('<' + tag + '>([^<]*)', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[1].trim());
  return out;
}

function fmtDate(raw) {
  const m = String(raw || '').match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : raw || '';
}

function parseOfxFull(text) {
  const bodyStart = text.search(/<OFX[\s>]/i);
  const body = bodyStart >= 0 ? text.slice(bodyStart) : text;
  const isXml = /<\/TRNAMT>/i.test(body) || /<\/ACCTID>/i.test(body);
  const txns = [];

  if (isXml) {
    const stmtBlocks = extractBlocks(body, 'STMTTRNRS').concat(extractBlocks(body, 'INVSTMTTRNRS'));
    for (const stmt of stmtBlocks) {
      for (const block of extractBlocks(stmt, 'STMTTRN')) {
        txns.push({
          date: fmtDate(tagVal(block, 'DTPOSTED')),
          type: tagVal(block, 'TRNTYPE'),
          amount: tagVal(block, 'TRNAMT'),
          name: tagVal(block, 'NAME'),
          memo: tagVal(block, 'MEMO'),
          id: tagVal(block, 'FITID'),
        });
      }
    }
  } else {
    // SGML flat scan — pair up parallel arrays
    const dates   = allTagVals(body, 'DTPOSTED');
    const types   = allTagVals(body, 'TRNTYPE');
    const amounts = allTagVals(body, 'TRNAMT');
    const names   = allTagVals(body, 'NAME');
    const memos   = allTagVals(body, 'MEMO');
    const ids     = allTagVals(body, 'FITID');
    for (let i = 0; i < dates.length; i++) {
      txns.push({
        date: fmtDate(dates[i]),
        type: types[i] || '',
        amount: amounts[i] || '',
        name: names[i] || '',
        memo: memos[i] || '',
        id: ids[i] || '',
      });
    }
  }

  return txns;
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
        const txns = parseOfxFull(intake.text || '');
        const header = rowToCsv(['Date', 'Type', 'Amount', 'Name', 'Memo', 'Transaction ID']);
        const rows = txns.map((t) => rowToCsv([t.date, t.type, t.amount, t.name, t.memo, t.id]));
        const csv = [header, ...rows].join('\r\n') + '\r\n';
        downloadBlob(csv, base + '.csv', 'text/csv');
      },
    },
  ];
}
