// CSV/TSV exports (loadExports hook): convert the parsed table to JSON or Excel (.xlsx). JSON is
// dependency-free; xlsx uses the already-vendored SheetJS (lazy-loaded on use).
import { downloadBlob } from '../../../core/exports.js';
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { parseCsv } from './renderer.js';
import { csvRowsToRecords } from './shape.js';

export function getExports(intake, state) {
  const settings = (state && state.settingsModel && state.settingsModel.values) || {};
  const header = settings.csvHeader !== false;
  const base = (intake.filename || 'data').replace(/\.[^.]+$/, '');
  return [
    {
      label: 'Download as JSON',
      run: async () => {
        const { rows } = await parseCsv(intake, settings);
        downloadBlob(JSON.stringify(csvRowsToRecords(rows, header), null, 2), base + '.json', 'application/json');
      },
    },
    {
      label: 'Download as Excel (.xlsx)',
      run: async () => {
        const XLSX = await loadGlobal(vendor('xlsx/xlsx.full.min.js'), 'XLSX');
        const { rows } = await parseCsv(intake, settings);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        downloadBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), base + '.xlsx');
      },
    },
  ];
}
