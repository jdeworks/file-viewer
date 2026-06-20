// SQLite database browser — rendered in the parent pane (interactive: table list, data grid,
// query panel with history, EXPLAIN QUERY PLAN, and CSV/JSON export).
// The DB is loaded into WASM memory; nothing is written back to the file.
// Values come from the DB and are escaped before display.
import { openDb, listTables, query } from './sqlitelib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROW_LIMIT = 200;
const HISTORY_KEY = 'sq-query-history';
const HISTORY_MAX = 50;

function historyLoad() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function historySave(sql) {
  const h = [sql, ...historyLoad().filter(s => s !== sql)].slice(0, HISTORY_MAX);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}

function cell(v) {
  if (v == null) return '<td class="sq-null">NULL</td>';
  if (v instanceof Uint8Array) return '<td class="sq-blob">[blob ' + v.length + ' bytes]</td>';
  return '<td>' + esc(v) + '</td>';
}

function gridHtml(columns, rows, note) {
  if (!columns.length) return '<p class="sq-note">' + esc(note || 'No rows.') + '</p>';
  const head = '<tr>' + columns.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr>';
  const body = rows.map((r) => '<tr>' + r.map(cell).join('') + '</tr>').join('');
  return (note ? '<p class="sq-note">' + esc(note) + '</p>' : '')
    + '<div class="sq-grid-wrap"><table class="sq-grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportCsv(columns, rows, filename) {
  const escape = (v) => {
    const s = String(v == null ? '' : (v instanceof Uint8Array ? '[blob]' : v));
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [columns.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  downloadBlob(new Blob([lines.join('\r\n')], { type: 'text/csv' }), filename);
}

function exportJson(columns, rows, filename) {
  const data = rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i] instanceof Uint8Array ? null : (r[i] ?? null)])));
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'sq-doc';

  let db, tables;
  try { db = await openDb(intake.bytes); tables = listTables(db); }
  catch (e) { host.innerHTML = '<div class="json-error"><strong>Could not open database</strong><br>' + esc(e.message) + '</div>'; return { parentNode: host }; }

  host.innerHTML =
    '<aside class="sq-side"><div class="sq-side-head">Tables <span class="sq-count">' + tables.length + '</span></div><ul class="sq-tables"></ul></aside>'
    + '<div class="sq-main">'
    + '<div class="sq-query">'
    +   '<input class="sq-sql" type="text" placeholder="SELECT * FROM …" spellcheck="false" list="sq-history-list">'
    +   '<datalist id="sq-history-list"></datalist>'
    +   '<button class="sq-run">Run</button>'
    +   '<button class="sq-explain" title="Show EXPLAIN QUERY PLAN">Explain</button>'
    +   '<button class="sq-export-csv" title="Export result as CSV" hidden>CSV</button>'
    +   '<button class="sq-export-json" title="Export result as JSON" hidden>JSON</button>'
    + '</div>'
    + '<div class="sq-result"></div></div>';

  const listEl = host.querySelector('.sq-tables');
  const resultEl = host.querySelector('.sq-result');
  const sqlInput = host.querySelector('.sq-sql');
  const historyList = host.querySelector('#sq-history-list');
  const exportCsvBtn = host.querySelector('.sq-export-csv');
  const exportJsonBtn = host.querySelector('.sq-export-json');

  let lastColumns = [], lastRows = [], lastLabel = '';

  function refreshHistoryDatalist() {
    historyList.innerHTML = historyLoad().map(s => '<option value="' + esc(s) + '">').join('');
  }
  refreshHistoryDatalist();

  // Arrow-up/down cycle through history in the input
  let histIdx = -1;
  sqlInput.addEventListener('keydown', (e) => {
    const h = historyLoad();
    if (e.key === 'ArrowUp') { e.preventDefault(); histIdx = Math.min(histIdx + 1, h.length - 1); if (h[histIdx]) sqlInput.value = h[histIdx]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); histIdx = Math.max(histIdx - 1, -1); sqlInput.value = histIdx < 0 ? '' : (h[histIdx] || ''); }
    else { histIdx = -1; }
  });

  function showExportButtons(show) {
    exportCsvBtn.hidden = !show;
    exportJsonBtn.hidden = !show;
  }

  function setResult(columns, rows, note) {
    lastColumns = columns; lastRows = rows; lastLabel = note;
    resultEl.innerHTML = gridHtml(columns, rows, note);
    showExportButtons(columns.length > 0);
  }

  for (const t of tables) {
    const li = document.createElement('li');
    li.className = 'sq-table';
    li.innerHTML = '<span class="sq-tname">' + esc(t.name) + '</span>' + (t.count != null ? '<span class="sq-trows">' + t.count + '</span>' : '');
    li.addEventListener('click', () => { for (const x of listEl.children) x.classList.toggle('active', x === li); showTable(t); });
    listEl.appendChild(li);
  }

  function showTable(t) {
    sqlInput.value = 'SELECT * FROM "' + t.name + '"';
    try {
      const { columns, rows } = query(db, 'SELECT * FROM "' + t.name.replace(/"/g, '""') + '" LIMIT ' + ROW_LIMIT);
      const note = (t.count != null && t.count > ROW_LIMIT) ? 'Showing first ' + ROW_LIMIT + ' of ' + t.count + ' rows' : (rows.length + ' row' + (rows.length === 1 ? '' : 's'));
      setResult(columns, rows, note);
    } catch (e) { resultEl.innerHTML = '<p class="sq-err">' + esc(e.message) + '</p>'; showExportButtons(false); }
  }

  function runQuery() {
    const sql = sqlInput.value.trim();
    if (!sql) return;
    historySave(sql);
    refreshHistoryDatalist();
    histIdx = -1;
    try {
      const { columns, rows } = query(db, sql);
      setResult(columns, rows, rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' returned');
    } catch (e) { resultEl.innerHTML = '<p class="sq-err">' + esc(e.message) + '</p>'; showExportButtons(false); }
  }

  function runExplain() {
    const sql = sqlInput.value.trim();
    if (!sql) return;
    try {
      const { columns, rows } = query(db, 'EXPLAIN QUERY PLAN ' + sql);
      setResult(columns, rows, 'EXPLAIN QUERY PLAN');
    } catch (e) { resultEl.innerHTML = '<p class="sq-err">' + esc(e.message) + '</p>'; showExportButtons(false); }
  }

  host.querySelector('.sq-run').addEventListener('click', runQuery);
  host.querySelector('.sq-explain').addEventListener('click', runExplain);
  sqlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runQuery(); });

  exportCsvBtn.addEventListener('click', () => {
    const base = (intake.filename || 'query').replace(/\.[^.]+$/, '');
    exportCsv(lastColumns, lastRows, base + '.csv');
  });
  exportJsonBtn.addEventListener('click', () => {
    const base = (intake.filename || 'query').replace(/\.[^.]+$/, '');
    exportJson(lastColumns, lastRows, base + '.json');
  });

  if (tables.length) { listEl.firstChild.classList.add('active'); showTable(tables[0]); }
  else resultEl.innerHTML = '<p class="sq-note">This database has no tables.</p>';

  return { parentNode: host, revoke: () => { try { db.close(); } catch {} } };
}
