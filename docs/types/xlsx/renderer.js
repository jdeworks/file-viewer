// Excel/ODS preview: SheetJS -> rows per sheet -> shared tabular renderer (multi-sheet).
import { readWorkbook } from './xlsxlib.js';
import { renderTables } from '../../core/tabular.js';

export async function render(intake, ctx) {
  const settings = ctx?.settings || {};
  const { XLSX, wb } = await readWorkbook(intake);
  const sheets = wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }),
  }));
  return {
    bodyHtml: renderTables({ sheets, firstRowHeader: settings.firstRowHeader !== false }),
    hadUnsafe: false,
  };
}
