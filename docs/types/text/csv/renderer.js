// CSV/TSV viewer + inline table editor. Rendered in parentNode mode so the TableEditor
// (contenteditable cells, Tab/Enter nav, add/delete rows+columns) works without iframe
// postMessage. Chart.js is lazy-loaded only when the Chart tab is shown.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { TableEditor } from './table-editor.js';
import { csvColumnLabels, csvShapeDiagnostics, maxCsvColumns } from './shape.js';

const DELIMS = { auto: '', comma: ',', semicolon: ';', tab: '\t', pipe: '|' };

export async function parseCsv(intake, settings = {}) {
  const Papa = await loadGlobal(vendor('papaparse/papaparse.min.js'), 'Papa');
  const res = Papa.parse(intake.text || '', {
    delimiter: DELIMS[settings.delimiter || 'auto'] ?? '',
    skipEmptyLines: 'greedy',
  });
  return {
    rows: res.data,
    delimiter: res.meta?.delimiter || ',',
    diagnostics: csvShapeDiagnostics(res.data, res.errors, settings.csvHeader !== false),
  };
}

function csvEsc(v) {
  const s = String(v ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function rowsToCsv(rows, sep) {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? '');
    return (s.includes(sep) || s.includes('"') || s.includes('\n') || s.includes('\r'))
      ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(sep)).join('\r\n');
}

export async function render(intake, ctx) {
  const settings = ctx?.settings || {};
  const hasHeader = settings.csvHeader !== false;
  const { rows, delimiter, diagnostics } = await parseCsv(intake, settings);

  const sep = delimiter || ',';
  const numRows = rows.length;
  const numCols = maxCsvColumns(rows);
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');

  const host = document.createElement('div');
  host.className = 'csv-doc';

  // Header bar
  const info = document.createElement('div');
  info.className = 'csv-info';
  info.innerHTML =
    '<span class="csv-stat">' + numRows + ' row' + (numRows === 1 ? '' : 's') + '</span>'
    + '<span class="csv-stat">' + numCols + ' col' + (numCols === 1 ? '' : 's') + '</span>'
    + '<span class="csv-sep">sep: ' + (sep === '\t' ? 'tab' : sep) + '</span>';

  const toolbar = document.createElement('div');
  toolbar.className = 'csv-toolbar';
  const tableTab = document.createElement('button');
  tableTab.className = 'csv-tab active'; tableTab.textContent = 'Table'; tableTab.type = 'button';
  const chartTab = document.createElement('button');
  chartTab.className = 'csv-tab'; chartTab.textContent = 'Chart'; chartTab.type = 'button';
  const exportBtn = document.createElement('button');
  exportBtn.className = 'csv-export'; exportBtn.textContent = 'Export CSV'; exportBtn.type = 'button';
  toolbar.append(tableTab, chartTab, exportBtn);

  // Panels
  const tablePanel = document.createElement('div');
  tablePanel.className = 'csv-panel';
  const chartPanel = document.createElement('div');
  chartPanel.className = 'csv-panel'; chartPanel.hidden = true;
  chartPanel.innerHTML = '<canvas class="csv-chart-canvas"></canvas>';

  host.append(info, toolbar, tablePanel, chartPanel);
  if (diagnostics.length) {
    const warning = document.createElement('div');
    warning.className = 'csv-warning';
    warning.setAttribute('role', 'note');
    warning.textContent = 'Recovered CSV with warnings: ' + diagnostics.join(' ');
    host.prepend(warning);
  }

  // Mount table editor
  let tableEditor = null;
  let currentRows = rows.map((r) => [...r]);
  tableEditor = new TableEditor(tablePanel, rowsToCsv(currentRows, sep), sep, (newCsv) => {
    // Keep internal copy in sync so export works
    currentRows = newCsv.split('\n').map((line) => line.split(sep).map((c) => c.replace(/^"|"$/g, '')));
  }, hasHeader);

  // Tab switching
  let chartLoaded = false;
  tableTab.addEventListener('click', () => {
    tablePanel.hidden = false; chartPanel.hidden = true;
    tableTab.classList.add('active'); chartTab.classList.remove('active');
  });
  chartTab.addEventListener('click', async () => {
    chartPanel.hidden = false; tablePanel.hidden = true;
    chartTab.classList.add('active'); tableTab.classList.remove('active');
    if (chartLoaded) return;
    chartLoaded = true;
    const data = hasHeader ? rows.slice(1) : rows;
    const numericCols = Array.from({ length: numCols }, (_, columnIndex) => columnIndex)
      .filter((columnIndex) => {
        const populated = data.map((row) => row[columnIndex])
          .filter((value) => value != null && String(value).trim() !== '');
        return populated.length > 0 && populated.every((value) => Number.isFinite(Number(value)));
      });
    if (!numericCols.length) {
      chartPanel.innerHTML = '<p class="csv-empty">No numeric columns detected for charting.</p>';
      return;
    }
    try {
      const Chart = await loadGlobal(vendor('chartjs/chart.umd.js'), 'Chart');
      const header = csvColumnLabels(rows, hasHeader);
      const labelCol = numericCols[0] === 0 ? -1 : 0;
      const labels = labelCol >= 0 ? data.map((r) => String(r[labelCol]).slice(0, 30)) : data.map((_, i) => String(i + 1));
      const colours = ['#4e9af1', '#e05c6b', '#4db889', '#f5a623', '#9b59b6', '#1abc9c', '#e67e22', '#2980b9'];
      const datasets = numericCols.slice(0, 8).map((ci, k) => ({
        label: String(header[ci]),
        data: data.map((r) => r[ci] == null || String(r[ci]).trim() === '' ? null : Number(r[ci])),
        borderColor: colours[k % colours.length],
        backgroundColor: colours[k % colours.length] + '33',
        tension: 0.3, fill: numericCols.length === 1,
      }));
      const canvas = chartPanel.querySelector('.csv-chart-canvas');
      new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } },
      });
    } catch { chartPanel.innerHTML = '<p class="csv-empty">Chart unavailable.</p>'; }
  });

  // Export: get current state from TableEditor if available, else original rows
  exportBtn.addEventListener('click', () => {
    const csv = tableEditor ? tableEditor.getValue() : rowsToCsv(currentRows, sep);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base + '_export.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // styledHost: let app.js apply the generic Preview settings (width/font-size) to this table view.
  return { parentNode: host, styledHost: true };
}
