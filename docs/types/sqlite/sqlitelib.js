// SQLite access via vendored sql.js (SQLite compiled to WASM). The WASM binary is fetched
// same-origin from docs/vendor/ (locateFile), so the zero-off-origin guarantee holds. Loaded
// only when a .db/.sqlite file is opened — never at startup.
import { vendor } from '../../core/script-loader.js';

let sqlPromise = null;

// sql.js's Emscripten UMD only assigns its `initSqlJs` factory to module/exports/define — never
// to a global. We run it with those shadowed (to dodge Monaco's AMD `define`) and append a line
// that copies the top-level `initSqlJs` var onto window. Same-origin fetch; no CDN.
async function loadInitSqlJs() {
  if (window.initSqlJs) return window.initSqlJs;
  const res = await fetch(vendor('sql.js/sql-wasm.js'));
  if (!res.ok) throw new Error('Failed to load sql.js (' + res.status + ')');
  const code = await res.text();
  new Function('define', 'module', 'exports', code + '\n;if(typeof initSqlJs!=="undefined"){this.initSqlJs=initSqlJs;}')
    .call(window, undefined, undefined, undefined);
  if (!window.initSqlJs) throw new Error('initSqlJs missing after load');
  return window.initSqlJs;
}

async function getSQL() {
  if (!sqlPromise) {
    const initSqlJs = await loadInitSqlJs();
    sqlPromise = initSqlJs({ locateFile: () => vendor('sql.js/sql-wasm.wasm') });
  }
  return sqlPromise;
}

export async function openDb(bytes) {
  const SQL = await getSQL();
  return new SQL.Database(bytes);
}

export function parseHeader(bytes) {
  if (!bytes || bytes.length < 100) return null;
  const sig = 'SQLite format 3\0';
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig.charCodeAt(i)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pageSizeRaw = dv.getUint16(16, false);
  const pageSize = pageSizeRaw === 1 ? 65536 : pageSizeRaw;
  const encodingId = dv.getUint32(56, false);
  const encodings = { 1: 'UTF-8', 2: 'UTF-16le', 3: 'UTF-16be' };
  const sqliteVersion = dv.getUint32(96, false);
  const versionText = sqliteVersion
    ? Math.floor(sqliteVersion / 1000000) + '.' + Math.floor((sqliteVersion % 1000000) / 1000) + '.' + (sqliteVersion % 1000)
    : '';
  return {
    pageSize,
    writeVersion: bytes[18],
    readVersion: bytes[19],
    pages: dv.getUint32(28, false),
    freelistPages: dv.getUint32(36, false),
    schemaFormat: dv.getUint32(44, false),
    encoding: encodings[encodingId] || (encodingId ? 'Unknown (' + encodingId + ')' : ''),
    userVersion: dv.getUint32(60, false),
    applicationId: dv.getUint32(68, false),
    sqliteVersion,
    versionText,
  };
}

// User tables (excluding sqlite internal tables), with row counts.
export function listTables(db) {
  const res = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name");
  const names = res.length ? res[0].values.map((r) => r[0]) : [];
  return names.map((name) => {
    let count = null;
    try { const c = db.exec('SELECT COUNT(*) FROM "' + name.replace(/"/g, '""') + '"'); count = c.length ? c[0].values[0][0] : null; } catch { /* view may error */ }
    return { name, count };
  });
}

// Run a query; returns { columns, rows } of the first result set (or empty).
export function query(db, sql) {
  const res = db.exec(sql);
  if (!res.length) return { columns: [], rows: [] };
  return { columns: res[0].columns, rows: res[0].values };
}
