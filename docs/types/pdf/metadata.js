// PDF embedded metadata — including the creation date, which (unlike OS create-time)
// genuinely lives inside the file.
import { openDoc } from './pdflib.js';

// PDF date format: "D:YYYYMMDDHHmmSSOHH'mm'". Parse leniently to a readable string.
function pdfDate(s) {
  if (!s) return null;
  const m = /^D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(s);
  if (!m) return s;
  const [_, y, mo = '01', d = '01', h = '00', mi = '00', se = '00'] = m;
  const dt = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
  return Number.isNaN(dt.getTime()) ? s : dt.toLocaleString();
}

export async function extract(intake) {
  const doc = await openDoc(intake);
  const { info = {} } = await doc.getMetadata();
  const rows = [{ label: 'Pages', value: String(doc.numPages) }];
  const add = (label, value) => { if (value) rows.push({ label, value: String(value) }); };
  add('Title', info.Title);
  add('Author', info.Author);
  add('Subject', info.Subject);
  add('Creator', info.Creator);
  add('Producer', info.Producer);
  add('PDF version', info.PDFFormatVersion);
  add('Created', pdfDate(info.CreationDate));
  add('Modified', pdfDate(info.ModDate));
  return rows;
}
