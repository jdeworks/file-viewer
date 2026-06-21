// Excel/ODS preview + inline editor. SheetJS parses the workbook (in the parent, trusted) and we
// render every sheet as an EDITABLE grid in the parent pane (parentNode mode), with a per-cell
// delta buffer and a "Download edited .xlsx" that writes the modified workbook via SheetJS —
// untouched sheets are preserved. .xls/.ods open editable too (SheetJS reads them; export is xlsx).
import { mountXlsxEditor } from './editor.js';

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  await mountXlsxEditor(intake, host);
  return { parentNode: host };
}
