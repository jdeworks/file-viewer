// Shared tabular renderer. Consumed by CSV, Excel, ODS — one render path, many parsers.
// Produces sanitized HTML (cells escaped) for the sandboxed preview iframe. Row cap keeps
// huge sheets responsive (reported, not silent). Multiple sheets stack under headings.
const MAX_ROWS = 5000;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderSheet(sheet, { firstRowHeader }) {
  const rows = sheet.rows || [];
  const shown = rows.slice(0, MAX_ROWS);
  let head = '', bodyRows = shown;
  if (firstRowHeader && shown.length) {
    head = '<thead><tr>' + (shown[0] || []).map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead>';
    bodyRows = shown.slice(1);
  }
  const body = '<tbody>' + bodyRows.map((r) =>
    '<tr>' + (r || []).map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  const note = rows.length > MAX_ROWS ? '<p class="tbl-note">Showing first ' + MAX_ROWS + ' of ' + rows.length + ' rows.</p>' : '';
  const title = sheet.name ? '<h3 class="sheet-title">' + esc(sheet.name) + '</h3>' : '';
  const cols = shown.reduce((m, r) => Math.max(m, (r || []).length), 0);
  const meta = '<p class="tbl-meta">' + rows.length + ' rows × ' + cols + ' cols</p>';
  return '<section class="sheet">' + title + meta + '<div class="table-wrap"><table>' + head + body + '</table></div>' + note + '</section>';
}

export function renderTables({ sheets = [], firstRowHeader = true }) {
  const body = sheets.map((s) => renderSheet(s, { firstRowHeader })).join('\n');
  return '<div class="tabular">' + body + '</div>';
}
