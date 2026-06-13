// Shared SheetJS loader. SheetJS runs in the parent (trusted, vendored) and PARSES the
// workbook into plain rows — the file is never executed.
import { loadGlobal, vendor } from '../../core/script-loader.js';

export function loadXLSX() {
  return loadGlobal(vendor('xlsx/xlsx.full.min.js'), 'XLSX');
}

export async function readWorkbook(intake) {
  const XLSX = await loadXLSX();
  return { XLSX, wb: XLSX.read(intake.bytes, { type: 'array', cellDates: true }) };
}
