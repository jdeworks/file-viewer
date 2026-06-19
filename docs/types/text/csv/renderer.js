// CSV preview: PapaParse -> rows -> shared tabular renderer.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { renderTables } from '../../../core/tabular.js';

const DELIMS = { auto: '', comma: ',', semicolon: ';', tab: '\t', pipe: '|' };

export async function parseCsv(intake, settings = {}) {
  const Papa = await loadGlobal(vendor('papaparse/papaparse.min.js'), 'Papa');
  const res = Papa.parse(intake.text || '', {
    delimiter: DELIMS[settings.delimiter || 'auto'] ?? '',
    skipEmptyLines: 'greedy',
  });
  return { rows: res.data, delimiter: res.meta?.delimiter || ',' };
}

function chartHtml(rows, hasHeader) {
  const maxRows = 100;
  const header = hasHeader ? rows[0] : rows[0].map((_, i) => 'col' + (i + 1));
  const data = (hasHeader ? rows.slice(1) : rows).slice(0, maxRows);
  const numericCols = header.map((_, ci) => data.every((r) => r[ci] !== '' && !isNaN(Number(r[ci])))).map((ok, i) => ok ? i : -1).filter((i) => i >= 0);
  if (!numericCols.length) return '';
  const labelCol = numericCols[0] === 0 ? -1 : 0;
  const labels = labelCol >= 0 ? data.map((r) => String(r[labelCol]).slice(0, 30)) : data.map((_, i) => String(i + 1));
  const colours = ['#4e9af1','#e05c6b','#4db889','#f5a623','#9b59b6','#1abc9c','#e67e22','#2980b9'];
  const datasets = numericCols.slice(0, 8).map((ci, k) => ({
    label: String(header[ci]),
    data: data.map((r) => Number(r[ci]) || 0),
    borderColor: colours[k % colours.length],
    backgroundColor: colours[k % colours.length] + '33',
    tension: 0.3,
    fill: numericCols.length === 1,
  }));
  const cfg = JSON.stringify({ type: 'line', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } } });
  return `<div id="csv-chart-wrap" style="height:320px;padding:12px;box-sizing:border-box"><canvas id="csv-chart"></canvas></div>`
    + `<script src="/vendor/chartjs/chart.umd.js"><\/script>`
    + `<script>new Chart(document.getElementById('csv-chart'),${cfg})<\/script>`;
}

export async function render(intake, ctx) {
  const settings = ctx?.settings || {};
  const hasHeader = settings.csvHeader !== false;
  const { rows } = await parseCsv(intake, settings);
  const tableHtml = renderTables({ sheets: [{ name: '', rows }], firstRowHeader: hasHeader });
  const chart = rows.length > 1 ? chartHtml(rows, hasHeader) : '';
  const tabBar = chart ? '<div style="display:flex;gap:0;margin-bottom:-1px;font:13px/1 system-ui">'
    + '<button onclick="this.parentNode.nextSibling.style.display=\'\';this.parentNode.nextSibling.nextSibling.style.display=\'none\';this.style.fontWeight=\'bold\';this.nextSibling.style.fontWeight=\'\'" style="padding:4px 12px;border:1px solid #ccc;border-bottom:none;background:#fff;cursor:pointer;font-weight:bold">Table</button>'
    + '<button onclick="this.previousSibling.style.fontWeight=\'\';this.style.fontWeight=\'bold\';this.parentNode.nextSibling.style.display=\'none\';this.parentNode.nextSibling.nextSibling.style.display=\'\'" style="padding:4px 12px;border:1px solid #ccc;border-bottom:none;background:#fff;cursor:pointer">Chart</button>'
    + '</div>' : '';
  const tableWrap = chart ? '<div>' + tableHtml + '</div>' : tableHtml;
  const chartWrap = chart ? '<div style="display:none">' + chart + '</div>' : '';
  return { bodyHtml: tabBar + tableWrap + chartWrap, hadUnsafe: false };
}
