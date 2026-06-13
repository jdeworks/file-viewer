import { dataUrl, mimeFor, isSvg } from './imglib.js';

export async function extract(intake) {
  const rows = [{ label: 'Format', value: isSvg(intake) ? 'SVG (vector)' : mimeFor(intake) }];
  const dim = await import('./imglib.js').then((m) => m.dimensions(dataUrl(intake)));
  if (dim) rows.push({ label: 'Dimensions', value: dim.w + ' × ' + dim.h + ' px' });
  return rows;
}
