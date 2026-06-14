// Spreadsheet exports (loadExports hook): convert the workbook to CSV / JSON via the already-vendored
// SheetJS (lazy-loaded). The active sheet is the first one; multi-sheet workbooks also get a
// "Download all sheets as JSON" (sheet-name -> rows).
import { downloadBlob } from '../../../core/exports.js';
import { readWorkbook } from './xlsxlib.js';

export async function getExports(intake) {
  const base = (intake.filename || 'workbook').replace(/\.[^.]+$/, '');
  const { XLSX, wb } = await readWorkbook(intake);
  const names = wb.SheetNames;
  const first = names[0];
  const out = [
    {
      label: 'Download first sheet as CSV',
      run: () => downloadBlob(XLSX.utils.sheet_to_csv(wb.Sheets[first]), base + '.csv', 'text/csv'),
    },
    {
      label: 'Download first sheet as JSON',
      run: () => downloadBlob(JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: '' }), null, 2), base + '.json', 'application/json'),
    },
  ];
  if (names.length > 1) {
    out.push({
      label: 'Download all sheets as JSON',
      run: () => {
        const all = Object.fromEntries(names.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '' })]));
        downloadBlob(JSON.stringify(all, null, 2), base + '.json', 'application/json');
      },
    });
  }
  return out;
}
