// XLSX inline grid editor (parent pane, parentNode mode). Renders every sheet as an editable
// HTML table; edits are accumulated in a per-sheet DELTA buffer (Map of "r,c" -> new string),
// NOT re-serialized on every keystroke. On "Download edited .xlsx" the deltas are applied back to
// the ORIGINAL parsed workbook (so untouched sheets, formats, and the workbook's other parts are
// preserved as far as SheetJS round-trips them) and SheetJS writes a fresh .xlsx blob.
//
// Trust: SheetJS PARSES the workbook in the parent; nothing from the file executes. Cell values
// are placed via textContent (never innerHTML), so a malicious cell can't inject markup.
import { loadXLSX } from './xlsxlib.js';
import { downloadBlob } from '../../../core/exports.js';

const MAX_ROWS = 2000;            // editable-grid cap (huge sheets stay responsive)
const MAX_COLS = 200;

// A sheet's used range as { rows, cols } from SheetJS's !ref (fallback: scan the AOA).
function sheetDims(XLSX, ws, aoa) {
  const ref = ws['!ref'];
  if (ref) {
    const r = XLSX.utils.decode_range(ref);
    return { rows: r.e.r + 1, cols: r.e.c + 1 };
  }
  return { rows: aoa.length, cols: aoa.reduce((m, row) => Math.max(m, (row || []).length), 0) };
}

// Build one editable table for a sheet. Returns the <table>. Edits write into `delta`.
function buildTable(XLSX, sheetName, aoa, dims, delta) {
  const rows = Math.min(dims.rows, MAX_ROWS);
  const cols = Math.min(dims.cols, MAX_COLS);
  const table = document.createElement('table');
  table.className = 'xe-table';

  // Column header (A, B, C…) + row-number gutter.
  const thead = document.createElement('thead');
  const htr = document.createElement('tr');
  htr.appendChild(Object.assign(document.createElement('th'), { className: 'xe-corner' }));
  for (let c = 0; c < cols; c++) {
    const th = document.createElement('th');
    th.className = 'xe-colhdr';
    th.textContent = XLSX.utils.encode_col(c);
    htr.appendChild(th);
  }
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    const gut = document.createElement('th');
    gut.className = 'xe-rowhdr';
    gut.textContent = String(r + 1);
    tr.appendChild(gut);
    const rowArr = aoa[r] || [];
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'xe-cell';
      td.contentEditable = 'true';
      td.spellcheck = false;
      td.dataset.r = String(r);
      td.dataset.c = String(c);
      const v = rowArr[c];
      td.textContent = v == null ? '' : String(v);
      td.dataset.orig = td.textContent;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  // One delegated input handler per table: on edit, record the delta (or clear it when reverted).
  table.addEventListener('input', (e) => {
    const td = e.target.closest('.xe-cell');
    if (!td) return;
    const key = td.dataset.r + ',' + td.dataset.c;
    const val = td.textContent;
    if (val === td.dataset.orig) { delta.delete(key); td.classList.remove('xe-dirty'); }
    else { delta.set(key, val); td.classList.add('xe-dirty'); }
    table.dispatchEvent(new CustomEvent('xe-change', { bubbles: true }));
  });
  return table;
}

// Coerce an edited string back to a number/boolean where it's unambiguous, else keep it text.
function coerce(val) {
  if (val === '') return { t: 's', v: '' };
  if (val === 'TRUE' || val === 'FALSE') return { t: 'b', v: val === 'TRUE' };
  // Plain numeric (no leading zeros that would be lost, allow decimals / negatives / exponents).
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(val)) {
    const n = Number(val);
    if (Number.isFinite(n)) return { t: 'n', v: n };
  }
  return { t: 's', v: val };
}

// Apply a sheet's deltas back onto the original worksheet object, then return the workbook bytes.
function applyAndWrite(XLSX, wb, deltas) {
  for (const [name, delta] of deltas) {
    if (!delta.size) continue;
    const ws = wb.Sheets[name];
    if (!ws) continue;
    let maxR = 0, maxC = 0;
    if (ws['!ref']) { const rg = XLSX.utils.decode_range(ws['!ref']); maxR = rg.e.r; maxC = rg.e.c; }
    for (const [key, val] of delta) {
      const [r, c] = key.split(',').map(Number);
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = coerce(val);
      // Replace the cell wholesale (drops any stale formula/format on an edited cell — expected).
      ws[addr] = { t: cell.t, v: cell.v };
      if (cell.t === 'b') ws[addr].w = cell.v ? 'TRUE' : 'FALSE';
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}

export async function mountXlsxEditor(intake, host) {
  const XLSX = await loadXLSX();
  const wb = XLSX.read(intake.bytes, { type: 'array', cellDates: true });
  const names = wb.SheetNames;
  const base = (intake.filename || 'workbook').replace(/\.[^.]+$/, '');

  // Per-sheet delta buffers (shared across re-renders).
  const deltas = new Map(names.map((n) => [n, new Map()]));

  host.className = 'xe-doc';
  host.innerHTML = '';

  // Toolbar: status + a tab per sheet + download.
  const bar = document.createElement('div');
  bar.className = 'xe-bar';
  const info = document.createElement('span');
  info.className = 'xe-info';
  const tabs = document.createElement('div');
  tabs.className = 'xe-tabs';
  const dl = document.createElement('button');
  dl.className = 'xe-download';
  dl.textContent = 'Download edited .xlsx';
  dl.disabled = true;
  bar.append(info, tabs, dl);
  host.appendChild(bar);

  const grid = document.createElement('div');
  grid.className = 'xe-grid';
  host.appendChild(grid);

  const totalEdits = () => [...deltas.values()].reduce((a, d) => a + d.size, 0);
  const truncated = [];
  function refreshInfo() {
    const n = totalEdits();
    const trunc = truncated.length ? ' · ' + truncated.join('; ') : '';
    info.textContent = (n ? n + ' cell' + (n === 1 ? '' : 's') + ' edited — unsaved' : 'No edits') + trunc;
    info.classList.toggle('xe-modified', n > 0);
    dl.disabled = n === 0;
  }

  // Render each sheet's table once; tabs toggle visibility (cheap, preserves edit state in DOM).
  const panels = [];
  names.forEach((name, i) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true });
    const dims = sheetDims(XLSX, ws, aoa);
    if (dims.rows > MAX_ROWS || dims.cols > MAX_COLS) {
      truncated.push(name + ' shown to ' + Math.min(dims.rows, MAX_ROWS) + '×' + Math.min(dims.cols, MAX_COLS));
    }
    const panel = document.createElement('div');
    panel.className = 'xe-panel';
    panel.hidden = i !== 0;
    panel.appendChild(buildTable(XLSX, name, aoa, dims, deltas.get(name)));
    grid.appendChild(panel);
    panels.push(panel);

    const tab = document.createElement('button');
    tab.className = 'xe-tab' + (i === 0 ? ' active' : '');
    tab.textContent = name;
    tab.addEventListener('click', () => {
      panels.forEach((p, j) => { p.hidden = j !== i; });
      tabs.querySelectorAll('.xe-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
    });
    tabs.appendChild(tab);
  });

  grid.addEventListener('xe-change', refreshInfo);
  refreshInfo();

  dl.addEventListener('click', () => {
    try {
      const bytes = applyAndWrite(XLSX, wb, deltas);
      downloadBlob(bytes, base + '-edited.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
      info.textContent = 'Export failed: ' + err.message;
    }
  });

  return host;
}
