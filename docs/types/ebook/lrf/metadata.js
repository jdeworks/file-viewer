import { isLrf, readHeader, looksDrm } from './lrf-header.js';
import { openLrf } from './lrflib.js';

export async function extract(intake) {
  const b = intake.bytes;
  const rows = [{ label: 'Format', value: 'Sony LRF (BBeB)' }];
  if (b && isLrf(b) && !looksDrm(b)) {
    const h = readHeader(b);
    rows.push({ label: 'Version', value: String(h.version) });
    if (h.width && h.height) rows.push({ label: 'Screen', value: h.width + ' × ' + h.height + ' px' });
    try {
      const book = await openLrf(b);
      if (book.ok) {
        if (book.title) rows.push({ label: 'Title', value: book.title });
        if (book.author) rows.push({ label: 'Author', value: book.author });
        if (book.publisher) rows.push({ label: 'Publisher', value: book.publisher });
        if (book.language) rows.push({ label: 'Language', value: book.language });
        rows.push({ label: 'Pages', value: String(book.pages.length) });
        rows.push({ label: 'Images', value: String(book.imageCache.size) });
      }
    } catch { /* metadata is best-effort */ }
  } else {
    const ver = (b && b.length >= 10) ? (b[8] | (b[9] << 8)) : 0;
    if (ver) rows.push({ label: 'Version', value: String(ver) });
  }
  rows.push({ label: 'Size', value: (intake.size / 1024).toFixed(1) + ' KB' });
  return rows;
}
