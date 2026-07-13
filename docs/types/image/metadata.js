import { dataUrl, mimeFor, isSvg } from './imglib.js';
import { parseExif } from './exif.js';
import { parseImageContainer } from './byte-metadata.js';

export async function extract(intake) {
  const rows = [{ label: 'Format', value: isSvg(intake) ? 'SVG (vector)' : mimeFor(intake) }];
  const dim = await import('./imglib.js').then((m) => m.dimensions(dataUrl(intake)));
  if (dim) rows.push({ label: 'Dimensions', value: dim.w + ' × ' + dim.h + ' px' });
  rows.push(...parseImageContainer(intake.bytes));
  // EXIF (JPEG): camera, capture date, orientation.
  if (!isSvg(intake)) {
    const ex = parseExif(intake.bytes);
    if (ex) {
      const add = (label, v) => { if (v) rows.push({ label, value: String(v) }); };
      add('Camera', [ex.make, ex.model].filter(Boolean).join(' ').trim());
      add('Taken', ex.dateTimeOriginal || ex.dateTime);
      add('Orientation', ex.orientation);
      if (ex.pixelX && ex.pixelY) add('EXIF size', ex.pixelX + ' × ' + ex.pixelY + ' px');
      if (ex.gpsLat != null && ex.gpsLon != null) {
        const lat = ex.gpsLat.toFixed(1) + '°' + (ex.gpsLatRef || 'N');
        const lon = ex.gpsLon.toFixed(1) + '°' + (ex.gpsLonRef || 'E');
        rows.push({ label: 'GPS', value: lat + ', ' + lon });
      }
    }
  }
  return rows;
}
