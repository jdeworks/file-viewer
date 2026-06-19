// SQLite exports: dump tables to CSV or JSON. Opens the DB via sql.js (same WASM path as the
// renderer — already cached after the first load). Multi-table DBs export as a ZIP of CSVs.
import { downloadBlob } from '../../core/exports.js';
import { openDb, listTables, query } from './sqlitelib.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';

function rowsToCsv(columns, rows) {
  const esc = (v) => (v == null ? '' : String(v).includes(',') || String(v).includes('"') || String(v).includes('\n')
    ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
  return [columns.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
}

function rowsToObjects(columns, rows) {
  return rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] == null ? null : (r[i] instanceof Uint8Array ? '[blob]' : r[i])])));
}

async function dumpAll(intake) {
  const db = await openDb(intake.bytes);
  const tables = listTables(db);
  const out = {};
  for (const t of tables) {
    const { columns, rows } = query(db, 'SELECT * FROM "' + t.name.replace(/"/g, '""') + '"');
    out[t.name] = { columns, rows };
  }
  try { db.close(); } catch {}
  return out;
}

export function getExports(intake) {
  const base = (intake.filename || 'database').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Export all tables as JSON',
      run: async () => {
        const all = await dumpAll(intake);
        const json = Object.fromEntries(Object.entries(all).map(([t, { columns, rows }]) => [t, rowsToObjects(columns, rows)]));
        downloadBlob(JSON.stringify(json, null, 2), base + '.json', 'application/json');
      },
    },
    {
      label: 'Export tables as CSV (zip)',
      run: async () => {
        const all = await dumpAll(intake);
        const names = Object.keys(all);
        if (names.length === 1) {
          const { columns, rows } = all[names[0]];
          downloadBlob(rowsToCsv(columns, rows), base + '.csv', 'text/csv');
          return;
        }
        const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
        const zip = new JSZip();
        for (const [t, { columns, rows }] of Object.entries(all)) zip.file(t + '.csv', rowsToCsv(columns, rows));
        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, base + '-tables.zip', 'application/zip');
      },
    },
  ];
}
