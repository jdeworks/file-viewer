import { readWorkbook } from './xlsxlib.js';

export async function extract(intake) {
  const { XLSX, wb } = await readWorkbook(intake);
  const p = wb.Props || {};
  const rows = [
    { label: 'Sheets', value: String(wb.SheetNames.length) },
    { label: 'Sheet names', value: wb.SheetNames.join(', ') },
  ];
  const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };

  // Per-sheet dimensions (rows × cols of the used range) — a quick size read for each sheet.
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (ws && ws['!ref']) {
      const r = XLSX.utils.decode_range(ws['!ref']);
      add('"' + name + '" size', (r.e.r - r.s.r + 1) + ' rows × ' + (r.e.c - r.s.c + 1) + ' cols');
    }
  }
  // Defined names (named ranges) — author-facing structure SheetJS surfaces.
  if (Array.isArray(wb.Workbook?.Names) && wb.Workbook.Names.length) {
    add('Defined names', wb.Workbook.Names.map((n) => n.Name).filter(Boolean).join(', '));
  }

  add('Title', p.Title);
  add('Subject', p.Subject);
  add('Author', p.Author);
  add('Last modified by', p.LastAuthor);
  add('Keywords', p.Keywords);
  add('Company', p.Company);
  add('Manager', p.Manager);
  add('Application', p.Application);
  if (p.CreatedDate) add('Created', new Date(p.CreatedDate).toLocaleString());
  if (p.ModifiedDate) add('Modified', new Date(p.ModifiedDate).toLocaleString());
  return rows;
}
