// PDF preview: render pages to canvases (in the parent) and embed them as images in the
// sandboxed iframe. Capped page count keeps very large PDFs responsive (logged, not silent).
import { openDoc } from './pdflib.js';

const MAX_PAGES = 50;

export async function render(intake, ctx) {
  const scale = ctx?.settings?.pdfScale || 1.5;
  const doc = await openDoc(intake);
  const max = Math.min(doc.numPages, MAX_PAGES);
  const pages = [];
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pages.push('<img class="pdf-page" alt="Page ' + i + '" src="' + canvas.toDataURL('image/png') + '">');
    canvas.width = canvas.height = 0; // free
  }
  const note = doc.numPages > max
    ? '<p class="pdf-note">Showing first ' + max + ' of ' + doc.numPages + ' pages.</p>' : '';
  return {
    bodyHtml: '<div class="pdf-doc">' + pages.join('\n') + note + '</div>',
    hadUnsafe: false,
  };
}
