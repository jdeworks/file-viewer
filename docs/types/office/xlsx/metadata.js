import { readWorkbook } from './xlsxlib.js';

export async function extract(intake) {
  const { wb } = await readWorkbook(intake);
  const p = wb.Props || {};
  const rows = [
    { label: 'Sheets', value: String(wb.SheetNames.length) },
    { label: 'Sheet names', value: wb.SheetNames.join(', ') },
  ];
  const add = (label, value) => { if (value != null && value !== '') rows.push({ label, value: String(value) }); };
  add('Title', p.Title);
  add('Author', p.Author);
  add('Company', p.Company);
  if (p.CreatedDate) add('Created', new Date(p.CreatedDate).toLocaleString());
  if (p.ModifiedDate) add('Modified', new Date(p.ModifiedDate).toLocaleString());
  return rows;
}
