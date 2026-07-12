// Inline table editor for CSV/TSV: renders an editable <table> from parsed rows.
// Self-contained — no framework deps, pure DOM. Handles quoted fields, Tab/Enter
// navigation, add/delete rows+columns, and flushes back to CSV text on getValue().

import { csvColumnLabels } from './shape.js';

// Serialize a character safely for HTML text content (via textContent — not needed for
// innerHTML builds, but used in the idx cell). We use textContent everywhere so no esc needed.

// Parse CSV respecting RFC-4180 quoted fields. sep is ',' or '\t'.
function parseCsvText(text, sep) {
  const rows = [];
  let row = [];
  let i = 0;
  const n = text.length;
  while (i <= n) {
    if (i === n) {
      // end of input
      rows.push(row);
      break;
    }
    const ch = text[i];
    if (ch === '"') {
      // quoted field
      let val = '';
      i++; // skip opening quote
      while (i < n) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { val += '"'; i += 2; }
          else { i++; break; }  // closing quote
        } else {
          val += text[i++];
        }
      }
      row.push(val);
      // expect sep or line ending next
      if (i < n && text[i] === sep) i++;
      else if (i < n && text[i] === '\r') { i++; if (text[i] === '\n') i++; rows.push(row); row = []; }
      else if (i < n && text[i] === '\n') { i++; rows.push(row); row = []; }
    } else if (ch === sep) {
      row.push('');
      i++;
    } else if (ch === '\r' || ch === '\n') {
      row.push('');
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
      rows.push(row); row = [];
    } else {
      // unquoted field
      let val = '';
      while (i < n && text[i] !== sep && text[i] !== '\r' && text[i] !== '\n') {
        val += text[i++];
      }
      row.push(val);
      if (i < n && text[i] === sep) i++;
      else if (i < n && text[i] === '\r') { i++; if (text[i] === '\n') i++; rows.push(row); row = []; }
      else if (i < n && text[i] === '\n') { i++; rows.push(row); row = []; }
    }
  }
  // Drop trailing empty row that results from a trailing newline
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows.length ? rows : [['']];
}

// Serialize 2D array back to CSV/TSV text.
function toCsvText(rows, sep) {
  return rows.map((row) =>
    row.map((cell) => {
      const s = String(cell ?? '');
      return (s.includes(sep) || s.includes('"') || s.includes('\n') || s.includes('\r'))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    }).join(sep)
  ).join('\n');
}

export class TableEditor {
  constructor(container, text, sep, onChange, hasHeader = true) {
    this._sep = sep || ',';
    this._onChange = onChange;
    this._rows = parseCsvText(text, this._sep);
    this._container = container;
    // "First row is header" setting: only style row 0 as a header when honored —
    // keeps the table view consistent with the Chart tab / JSON export, which
    // already respect this setting (see renderer.js / exports.js).
    this._hasHeader = hasHeader !== false;
    this._render();
  }

  _maxCols() {
    return Math.max(...this._rows.map((r) => r.length), 1);
  }

  _render() {
    this._container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'te-wrapper';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'te-toolbar';
    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'te-btn'; addRowBtn.textContent = '+ Row'; addRowBtn.type = 'button';
    addRowBtn.title = 'Append a new empty row';
    addRowBtn.addEventListener('click', () => {
      this._rows.push(Array(this._maxCols()).fill(''));
      this._notifyAndRender();
    });
    const addColBtn = document.createElement('button');
    addColBtn.className = 'te-btn'; addColBtn.textContent = '+ Col'; addColBtn.type = 'button';
    addColBtn.title = 'Append a new empty column';
    addColBtn.addEventListener('click', () => {
      this._rows.forEach((r) => r.push(''));
      this._notifyAndRender();
    });
    toolbar.append(addRowBtn, addColBtn);

    // Scroll container
    const scroll = document.createElement('div');
    scroll.className = 'te-scroll';

    // Table
    const tbl = document.createElement('table');
    tbl.className = 'te-table';
    const tbody = document.createElement('tbody');
    const maxCols = this._maxCols();
    const columnLabels = csvColumnLabels(this._rows, this._hasHeader);

    this._rows.forEach((row, ri) => {
      const tr = document.createElement('tr');

      // Row index gutter cell
      const isHeaderRow = this._hasHeader && ri === 0;
      const idx = document.createElement('td');
      idx.className = 'te-idx';
      // Data-row numbering is always 1-based, regardless of whether row 0 is a header
      // (so it stays "1, 2, 3…" either way instead of starting at 0 when there's no header).
      idx.textContent = isHeaderRow ? '#' : String(this._hasHeader ? ri : ri + 1);
      idx.title = 'Right-click to delete this row';
      idx.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this._rows.length <= 1) return;
        this._rows.splice(ri, 1);
        this._notifyAndRender();
      });
      tr.append(idx);

      // Data cells
      for (let ci = 0; ci < maxCols; ci++) {
        const td = document.createElement('td');
        td.className = isHeaderRow ? 'te-cell te-header' : 'te-cell';
        td.contentEditable = 'true';
        td.textContent = row[ci] ?? '';
        td.dataset.ri = ri;
        td.dataset.ci = ci;
        if (isHeaderRow) {
          td.dataset.columnLabel = columnLabels[ci];
          td.setAttribute('aria-label', columnLabels[ci]);
          if (td.textContent === '') {
            td.classList.add('te-header-fallback');
            td.dataset.fallbackLabel = columnLabels[ci];
          }
        }

        td.addEventListener('blur', () => {
          if (!this._rows[ri]) return;
          while (this._rows[ri].length <= ci) this._rows[ri].push('');
          this._rows[ri][ci] = td.textContent;
          this._onChange?.(toCsvText(this._rows, this._sep));
        });

        td.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            // Tab: next cell right; at end of row go to first cell of next row
            if (ci < maxCols - 1) {
              tr.cells[ci + 2]?.focus();
            } else if (ri < this._rows.length - 1) {
              tbody.rows[ri + 1]?.cells[1]?.focus();
            }
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Enter: cell below
            tbody.rows[ri + 1]?.cells[ci + 1]?.focus();
          }
        });

        tr.append(td);
      }

      // Column-delete context menu on header row index cell (re-use right-click on header cells)
      if (ri === 0) {
        for (let ci = 0; ci < maxCols; ci++) {
          const headerCell = tr.cells[ci + 1];
          headerCell.title = 'Right-click to delete this column';
          headerCell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (maxCols <= 1) return;
            this._rows.forEach((r) => r.splice(ci, 1));
            this._notifyAndRender();
          });
        }
      }

      tbody.append(tr);
    });

    tbl.append(tbody);
    scroll.append(tbl);
    wrapper.append(toolbar, scroll);
    this._container.append(wrapper);
  }

  _notifyAndRender() {
    this._onChange?.(toCsvText(this._rows, this._sep));
    this._render();
  }

  getValue() { return toCsvText(this._rows, this._sep); }
  destroy() { this._container.innerHTML = ''; }
}
