import { openDb, listTables, parseHeader } from './sqlitelib.js';

function fmtSize(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
}

export async function extract(intake) {
  const header = parseHeader(intake.bytes);
  try {
    const db = await openDb(intake.bytes);
    const tables = listTables(db);
    const totalRows = tables.reduce((n, t) => n + (t.count || 0), 0);
    db.close();
    const rows = [
      { label: 'Tables / views', value: String(tables.length) },
      { label: 'Total rows', value: String(totalRows) },
      { label: 'Size', value: fmtSize(intake.size) },
    ];
    if (header) {
      rows.push({ label: 'Page size', value: fmtSize(header.pageSize) });
      if (header.pages) rows.push({ label: 'Pages', value: String(header.pages) });
      if (header.encoding) rows.push({ label: 'Encoding', value: header.encoding });
      if (header.userVersion) rows.push({ label: 'User version', value: String(header.userVersion) });
      if (header.applicationId) rows.push({ label: 'Application ID', value: '0x' + header.applicationId.toString(16).padStart(8, '0') });
      if (header.versionText) rows.push({ label: 'SQLite version', value: header.versionText });
    }
    return rows;
  } catch {
    return header
      ? [
          { label: 'SQLite', value: 'unreadable' },
          { label: 'Page size', value: fmtSize(header.pageSize) },
          { label: 'Pages', value: String(header.pages) },
        ]
      : [{ label: 'SQLite', value: 'unreadable' }];
  }
}
