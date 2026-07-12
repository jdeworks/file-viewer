// XLSX inline grid editor (parent pane, parentNode mode). Renders every sheet as an editable
// HTML table; edits are accumulated in a per-sheet DELTA buffer (Map of "r,c" -> edit record),
// NOT re-serialized on every keystroke. On "Download edited .xlsx" the deltas are applied back to
// the ORIGINAL parsed workbook (so untouched sheets, formats, and the workbook's other parts are
// preserved as far as SheetJS round-trips them) and SheetJS writes a fresh .xlsx blob.
//
// Trust: SheetJS PARSES the workbook in the parent; nothing from the file executes. Cell values
// are placed via textContent (never innerHTML), so a malicious cell can't inject markup.
import { loadXLSX, parseWorkbook } from './xlsxlib.js';
import { downloadBlob } from '../../../core/exports.js';
import {
  applyXlsxLiteralEdit,
  describeXlsxCell,
  describeXlsxSheetVisibility,
} from './cell-fidelity.js';

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
function buildTable(XLSX, sheetName, ws, aoa, dims, delta, onSelect) {
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
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = ws[address];
      const hasFormula = cell?.f != null;
      td.contentEditable = hasFormula ? 'false' : 'true';
      td.spellcheck = false;
      td.tabIndex = 0;
      td.dataset.r = String(r);
      td.dataset.c = String(c);
      td.dataset.address = address;
      td.dataset.formula = hasFormula ? 'true' : 'false';
      const v = rowArr[c];
      td.textContent = v == null ? '' : String(v);
      td.dataset.orig = td.textContent;
      if (hasFormula) {
        td.classList.add('xe-formula');
        td.title = 'Formula cell — select it to inspect or explicitly replace the formula';
      }
      if (Array.isArray(cell?.c) && cell.c.length) td.classList.add('xe-has-comment');
      if (cell?.l?.Target) td.classList.add('xe-has-link');
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
    else {
      const replaceFormula = td.dataset.formula === 'true';
      if (replaceFormula && td.dataset.formulaUnlocked !== 'true') {
        td.textContent = td.dataset.orig;
        return;
      }
      delta.set(key, { value: val, replaceFormula });
      td.classList.add('xe-dirty');
    }
    table.dispatchEvent(new CustomEvent('xe-change', { bubbles: true }));
  });
  const select = (e) => {
    const td = e.target.closest('.xe-cell');
    if (td) onSelect(sheetName, td.dataset.address, td);
  };
  table.addEventListener('click', select);
  table.addEventListener('focusin', select);
  return table;
}

// Apply a sheet's deltas back onto the original worksheet object, then return the workbook bytes.
function applyAndWrite(XLSX, wb, deltas) {
  for (const [name, delta] of deltas) {
    if (!delta.size) continue;
    const ws = wb.Sheets[name];
    if (!ws) continue;
    let maxR = 0, maxC = 0;
    if (ws['!ref']) { const rg = XLSX.utils.decode_range(ws['!ref']); maxR = rg.e.r; maxC = rg.e.c; }
    for (const [key, change] of delta) {
      const [r, c] = key.split(',').map(Number);
      const addr = XLSX.utils.encode_cell({ r, c });
      ws[addr] = applyXlsxLiteralEdit(ws[addr], change.value, { replaceFormula: change.replaceFormula });
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true });
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}

export async function mountXlsxEditor(intake, host) {
  const XLSX = await loadXLSX();
  const wb = parseWorkbook(XLSX, intake.bytes);
  const names = wb.SheetNames;
  const base = (intake.filename || 'workbook').replace(/\.[^.]+$/, '');

  // Per-sheet delta buffers (shared across re-renders).
  const deltas = new Map(names.map((n) => [n, new Map()]));

  host.className = 'xe-doc';
  host.innerHTML = '';

  const sheetStates = names.map((_, index) => describeXlsxSheetVisibility(wb, index));
  const initialSheetIndex = Math.max(0, sheetStates.findIndex((state) => state.code === 0));
  const hiddenSheets = sheetStates.filter((state) => state.code === 1).length;
  const veryHiddenSheets = sheetStates.filter((state) => state.code === 2).length;
  const unlockedFormulaCells = new Set();

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

  const cacheNote = document.createElement('div');
  cacheNote.className = 'xe-fidelity-note';
  cacheNote.textContent = 'Formula results are stored workbook values; this viewer does not recalculate formulas. Edits can leave other formula results stale until the downloaded copy is opened in a spreadsheet app.';
  host.appendChild(cacheNote);

  const replacementWarning = document.createElement('div');
  replacementWarning.className = 'xe-formula-warning';
  replacementWarning.hidden = true;
  replacementWarning.textContent = 'Formula replacement is enabled for this workbook. Confirmed cells export as literal values with their formulas removed; comments, hyperlinks, number formats, and other retained cell metadata stay attached.';
  host.appendChild(replacementWarning);

  const inspector = document.createElement('section');
  inspector.className = 'xe-inspector';
  inspector.setAttribute('aria-label', 'Selected cell details');
  inspector.setAttribute('aria-live', 'polite');
  host.appendChild(inspector);

  const grid = document.createElement('div');
  grid.className = 'xe-grid';
  host.appendChild(grid);

  const formulaDialog = document.createElement('dialog');
  formulaDialog.className = 'xe-formula-dialog';
  const dialogTitle = document.createElement('h2');
  dialogTitle.textContent = 'Replace formula?';
  const dialogText = document.createElement('p');
  const dialogFormula = document.createElement('code');
  const dialogImpact = document.createElement('p');
  dialogImpact.textContent = 'The downloaded workbook will contain a literal value in this cell. The formula cannot be restored from that edited copy.';
  const dialogActions = document.createElement('div');
  dialogActions.className = 'xe-dialog-actions';
  const dialogCancel = document.createElement('button');
  dialogCancel.type = 'button';
  dialogCancel.textContent = 'Cancel';
  const dialogAccept = document.createElement('button');
  dialogAccept.type = 'button';
  dialogAccept.className = 'xe-dialog-danger';
  dialogAccept.textContent = 'Replace formula';
  dialogActions.append(dialogCancel, dialogAccept);
  formulaDialog.append(dialogTitle, dialogText, dialogFormula, dialogImpact, dialogActions);
  host.appendChild(formulaDialog);

  let settleFormulaDialog = null;
  function finishFormulaDialog(accepted) {
    if (!settleFormulaDialog) return;
    const settle = settleFormulaDialog;
    settleFormulaDialog = null;
    formulaDialog.close();
    settle(accepted);
  }
  dialogCancel.addEventListener('click', () => finishFormulaDialog(false));
  dialogAccept.addEventListener('click', () => finishFormulaDialog(true));
  formulaDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishFormulaDialog(false);
  });
  function confirmFormulaReplacement(description) {
    dialogText.textContent = `${description.address} currently displays ${description.display || '(blank)'} from its cached result.`;
    dialogFormula.textContent = description.formula;
    formulaDialog.showModal();
    dialogCancel.focus();
    return new Promise((resolve) => { settleFormulaDialog = resolve; });
  }

  const totalEdits = () => [...deltas.values()].reduce((a, d) => a + d.size, 0);
  const truncated = [];
  function refreshInfo() {
    const n = totalEdits();
    const trunc = truncated.length ? ' · ' + truncated.join('; ') : '';
    const visibility = [
      hiddenSheets ? `${hiddenSheets} hidden sheet${hiddenSheets === 1 ? '' : 's'}` : '',
      veryHiddenSheets ? `${veryHiddenSheets} very hidden sheet${veryHiddenSheets === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    info.textContent = (n ? n + ' cell' + (n === 1 ? '' : 's') + ' edited — unsaved' : 'No edits')
      + (visibility.length ? ' · ' + visibility.join(' · ') : '') + trunc;
    info.classList.toggle('xe-modified', n > 0);
    dl.disabled = n === 0;
    replacementWarning.hidden = unlockedFormulaCells.size === 0;
  }

  let selectedCell = null;
  function inspectorField(label, value, field) {
    const row = document.createElement('div');
    row.className = 'xe-inspector-field';
    row.dataset.field = field;
    const key = document.createElement('span');
    key.className = 'xe-inspector-label';
    key.textContent = label;
    const body = document.createElement('span');
    body.className = 'xe-inspector-value';
    body.textContent = value || '—';
    row.append(key, body);
    inspector.appendChild(row);
    return body;
  }

  function selectCell(sheetName, address, td) {
    selectedCell?.classList.remove('xe-selected');
    selectedCell = td;
    selectedCell.classList.add('xe-selected');
    const cell = wb.Sheets[sheetName]?.[address];
    const description = describeXlsxCell(XLSX, cell, address);
    inspector.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'xe-inspector-heading';
    const location = document.createElement('strong');
    location.textContent = `${sheetName} · ${address}`;
    const kind = document.createElement('span');
    kind.className = 'xe-kind';
    kind.textContent = description.kind;
    heading.append(location, kind);
    inspector.appendChild(heading);
    if (description.formula) inspectorField('Formula', description.formula, 'formula');
    inspectorField(description.formula ? 'Cached value' : 'Raw value', description.cached, 'cached');
    inspectorField('Display', description.display, 'display');

    if (description.comments.length) {
      const comments = description.comments.map((comment) => `${comment.author}: ${comment.text}`).join('\n');
      inspectorField(description.comments.length === 1 ? 'Comment' : 'Comments', comments, 'comments');
    }
    if (description.hyperlink) {
      const linkBody = inspectorField('Hyperlink', '', 'hyperlink');
      linkBody.replaceChildren();
      if (description.hyperlink.clickable) {
        const anchor = document.createElement('a');
        anchor.href = description.hyperlink.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.referrerPolicy = 'no-referrer';
        anchor.textContent = description.hyperlink.target;
        linkBody.appendChild(anchor);
      } else {
        const blocked = document.createElement('span');
        blocked.className = 'xe-link-blocked';
        blocked.textContent = `${description.hyperlink.target} (shown only; non-HTTP(S) target)`;
        linkBody.appendChild(blocked);
      }
    }

    if (description.formula) {
      const actions = document.createElement('div');
      actions.className = 'xe-inspector-actions';
      const replacementKey = `${sheetName}!${address}`;
      if (td.dataset.formulaUnlocked === 'true') {
        const enabled = document.createElement('span');
        enabled.className = 'xe-replacement-enabled';
        enabled.textContent = 'Formula replacement enabled for this cell';
        actions.appendChild(enabled);
      } else {
        const replace = document.createElement('button');
        replace.type = 'button';
        replace.className = 'xe-formula-replace';
        replace.textContent = 'Replace formula…';
        replace.addEventListener('click', async () => {
          const accepted = await confirmFormulaReplacement(description);
          if (!accepted || !td.isConnected) return;
          td.dataset.formulaUnlocked = 'true';
          td.contentEditable = 'true';
          td.classList.add('xe-formula-unlocked');
          unlockedFormulaCells.add(replacementKey);
          refreshInfo();
          selectCell(sheetName, address, td);
          requestAnimationFrame(() => {
            td.focus();
            const selection = window.getSelection();
            selection?.selectAllChildren(td);
          });
        });
        actions.appendChild(replace);
      }
      inspector.appendChild(actions);
    }
  }

  // Render each sheet's table once; tabs toggle visibility (cheap, preserves edit state in DOM).
  const panels = [];
  names.forEach((name, i) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: null, blankrows: true });
    const dims = sheetDims(XLSX, ws, aoa);
    if (dims.rows > MAX_ROWS || dims.cols > MAX_COLS) {
      truncated.push(name + ' shown to ' + Math.min(dims.rows, MAX_ROWS) + '×' + Math.min(dims.cols, MAX_COLS));
    }
    const panel = document.createElement('div');
    panel.className = 'xe-panel';
    panel.dataset.sheetName = name;
    panel.hidden = i !== initialSheetIndex;
    panel.appendChild(buildTable(XLSX, name, ws, aoa, dims, deltas.get(name), selectCell));
    grid.appendChild(panel);
    panels.push(panel);

    const tab = document.createElement('button');
    const sheetState = sheetStates[i];
    tab.className = `xe-tab xe-tab-${sheetState.classToken}` + (i === initialSheetIndex ? ' active' : '');
    tab.dataset.visibility = String(sheetState.code);
    tab.textContent = name;
    tab.setAttribute('aria-label', `${name} — ${sheetState.label.toLowerCase()} sheet`);
    if (sheetState.code) {
      const badge = document.createElement('span');
      badge.className = 'xe-sheet-state';
      badge.textContent = sheetState.label;
      tab.append(' ', badge);
    }
    tab.addEventListener('click', () => {
      panels.forEach((p, j) => { p.hidden = j !== i; });
      tabs.querySelectorAll('.xe-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const firstCell = panels[i].querySelector('.xe-cell');
      if (firstCell) selectCell(name, firstCell.dataset.address, firstCell);
    });
    tabs.appendChild(tab);
  });

  grid.addEventListener('xe-change', refreshInfo);
  refreshInfo();
  const initialCell = panels[initialSheetIndex]?.querySelector('.xe-cell');
  if (initialCell) selectCell(names[initialSheetIndex], initialCell.dataset.address, initialCell);

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
