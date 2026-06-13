// SQLite database browser — rendered in the parent pane (interactive: table list, data grid,
// and a read-only SQL query box). The DB is loaded into WASM memory; nothing is written back to
// the file. Values come from the DB and are escaped before display.
import { openDb, listTables, query } from './sqlitelib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROW_LIMIT = 200;

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

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'sq-doc';

  let db, tables;
  try { db = await openDb(intake.bytes); tables = listTables(db); }
  catch (e) { host.innerHTML = '<div class="json-error"><strong>Could not open database</strong><br>' + esc(e.message) + '</div>'; return { parentNode: host }; }

  host.innerHTML =
    '<aside class="sq-side"><div class="sq-side-head">Tables <span class="sq-count">' + tables.length + '</span></div><ul class="sq-tables"></ul></aside>'
    + '<div class="sq-main">'
    + '<div class="sq-query"><input class="sq-sql" type="text" placeholder="SELECT * FROM … (read-only)" spellcheck="false"><button class="sq-run">Run</button></div>'
    + '<div class="sq-result"></div></div>';

  const listEl = host.querySelector('.sq-tables');
  const resultEl = host.querySelector('.sq-result');
  const sqlInput = host.querySelector('.sq-sql');

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
      resultEl.innerHTML = gridHtml(columns, rows, note);
    } catch (e) { resultEl.innerHTML = '<p class="sq-err">' + esc(e.message) + '</p>'; }
  }

  function runQuery() {
    const sql = sqlInput.value.trim();
    if (!sql) return;
    try {
      const { columns, rows } = query(db, sql);
      resultEl.innerHTML = gridHtml(columns, rows, rows.length + ' row' + (rows.length === 1 ? '' : 's') + ' returned');
    } catch (e) { resultEl.innerHTML = '<p class="sq-err">' + esc(e.message) + '</p>'; }
  }
  host.querySelector('.sq-run').addEventListener('click', runQuery);
  sqlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runQuery(); });

  if (tables.length) { listEl.firstChild.classList.add('active'); showTable(tables[0]); }
  else resultEl.innerHTML = '<p class="sq-note">This database has no tables.</p>';

  return { parentNode: host, revoke: () => { try { db.close(); } catch {} } };
}
