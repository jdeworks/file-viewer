// Image preview. Raster -> <img> with a data URL. SVG is text and can carry scripts, so it
// is sanitized with DOMPurify's SVG profile before being inlined in the sandboxed iframe.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { isSvg, dataUrl } from './imglib.js';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  if (isSvg(intake)) {
    const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
    DOMPurify.removed = [];
    const clean = DOMPurify.sanitize(intake.text || '', { USE_PROFILES: { svg: true, svgFilters: true } });
    return { bodyHtml: '<div class="img-doc">' + clean + '</div>', hadUnsafe: DOMPurify.removed.length > 0 };
  }
  const url = dataUrl(intake);
  return { bodyHtml: '<div class="img-doc"><img class="img-view" alt="' + esc(intake.filename) + '" src="' + url + '"></div>', hadUnsafe: false };
}
