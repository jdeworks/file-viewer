// Shared SheetJS loader. SheetJS runs in the parent (trusted, vendored) and PARSES the
// workbook into plain rows — the file is never executed.
import { loadGlobal, vendor } from '../../../core/script-loader.js';

export function loadXLSX() {
  return loadGlobal(vendor('xlsx/xlsx.full.min.js'), 'XLSX');
}

export const XLSX_READ_OPTIONS = Object.freeze({
  type: 'array',
  cellDates: true,
  cellFormula: true,
  cellHTML: false,
  cellNF: true,
  cellStyles: true,
  cellText: true,
});

export function parseWorkbook(XLSX, bytes) {
  return XLSX.read(bytes, XLSX_READ_OPTIONS);
}

export async function readWorkbook(intake) {
  const XLSX = await loadXLSX();
  return { XLSX, wb: parseWorkbook(XLSX, intake.bytes) };
}
