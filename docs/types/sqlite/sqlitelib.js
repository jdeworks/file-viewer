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
