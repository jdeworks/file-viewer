// Shared tabular renderer. Consumed by CSV, Excel, ODS — one render path, many parsers.
// Produces sanitized HTML (cells escaped) for the sandboxed preview iframe. Row cap keeps
// huge sheets responsive (reported, not silent). A single sheet renders inline; multiple sheets
// render as a CSS-only tab switcher (radio + labels — NO script, so it works in the sandbox),
// which scales far better than stacking every sheet vertically.
const MAX_ROWS = 5000;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sheetInner(sheet, { firstRowHeader }) {
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
  const cols = shown.reduce((m, r) => Math.max(m, (r || []).length), 0);
  const meta = '<p class="tbl-meta">' + rows.length + ' rows × ' + cols + ' cols</p>';
  return meta + '<div class="table-wrap"><table>' + head + body + '</table></div>' + note;
}

function renderSheet(sheet, opts) {
  const title = sheet.name ? '<h3 class="sheet-title">' + esc(sheet.name) + '</h3>' : '';
  return '<section class="sheet">' + title + sheetInner(sheet, opts) + '</section>';
}

// Multi-sheet: a CSS-only tab switcher. Radios precede the panels so a `:checked ~ panels` rule
// (emitted inline, scoped by unique ids) reveals just the active sheet. Each panel keeps its
// `.sheet-title` so existing consumers/tests still see the sheet names.
function renderTabbed(sheets, opts) {
  const uid = 'tb';   // one tabular view is shown at a time in the iframe, so fixed ids are safe
  const radios = sheets.map((s, i) => '<input type="radio" name="' + uid + '" id="' + uid + '-r' + i + '" class="sheet-radio"' + (i === 0 ? ' checked' : '') + '>').join('');
  const tabs = '<div class="sheet-tabbar" role="tablist">' + sheets.map((s, i) =>
    '<label class="sheet-tab" for="' + uid + '-r' + i + '">' + esc(s.name || ('Sheet ' + (i + 1))) + '</label>').join('') + '</div>';
  const panels = '<div class="sheet-panels">' + sheets.map((s, i) =>
    '<section class="sheet sheet-panel" id="' + uid + '-p' + i + '"><h3 class="sheet-title">' + esc(s.name || ('Sheet ' + (i + 1))) + '</h3>' + sheetInner(s, opts) + '</section>').join('') + '</div>';
  const css = '<style>' + sheets.map((s, i) =>
    '#' + uid + '-r' + i + ':checked~.sheet-panels>#' + uid + '-p' + i + '{display:block}').join('') + '</style>';
  return '<div class="sheet-tabbed">' + css + radios + tabs + panels + '</div>';
}

export function renderTables({ sheets = [], firstRowHeader = true }) {
  const opts = { firstRowHeader };
  const body = sheets.length > 1
    ? renderTabbed(sheets, opts)
    : sheets.map((s) => renderSheet(s, opts)).join('\n');
  return '<div class="tabular">' + body + '</div>';
}
