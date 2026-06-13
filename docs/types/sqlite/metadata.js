import { openDb, listTables } from './sqlitelib.js';

export async function extract(intake) {
  try {
    const db = await openDb(intake.bytes);
    const tables = listTables(db);
    const totalRows = tables.reduce((n, t) => n + (t.count || 0), 0);
    db.close();
    return [
      { label: 'Tables / views', value: String(tables.length) },
      { label: 'Total rows', value: String(totalRows) },
      { label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' },
    ];
  } catch {
    return [{ label: 'SQLite', value: 'unreadable' }];
  }
}
