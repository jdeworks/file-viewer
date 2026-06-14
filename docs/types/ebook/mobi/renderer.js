// MOBI / AZW reader. Parses the container (mobilib), rewrites the book's <img recindex="N"> refs
// to inline data: URLs from the embedded image records (zero off-origin — no network fetch),
// DOMPurify-sanitizes the HTML, and renders it via the shared sandboxed iframe like FB2/Markdown.
// DRM'd or HUFF/CDIC-compressed books show a clear, friendly note instead of garbage.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { openMobi } from './mobilib.js';

export async function render(intake, _ctx) {
  const result = openMobi(intake.bytes);
  if (!result.ok) {
    return { bodyHtml: '<div class="json-error"><strong>Can’t display this MOBI</strong><br>' + escapeText(result.reason) + '</div>', hadUnsafe: false };
  }
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');

  // Rewrite <img recindex="N"> (MOBI's image reference) to the inline data: URL for that record.
  let html = result.html.replace(/<img\b[^>]*?recindex=["']?0*(\d+)["']?[^>]*>/gi, (m, n) => {
    const src = result.images.get(parseInt(n, 10));
    return src ? '<img class="mobi-img" src="' + src + '" alt="">' : '';
  });
  // MOBI page breaks → horizontal rules; drop the publisher's <guide>/<mbp:*> cruft.
  html = html.replace(/<mbp:pagebreak\s*\/?>/gi, '<hr class="mobi-break">').replace(/<\/?mbp:[^>]*>/gi, '');

  const title = result.title ? '<header class="mobi-head"><h1 class="mobi-booktitle">' + escapeText(result.title) + '</h1></header>' : '';
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize('<article class="mobi-book">' + title + html + '</article>', {
    ADD_ATTR: ['target'],
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: ['script', 'style', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return { bodyHtml: clean, hadUnsafe: DOMPurify.removed.length > 0 };
}

function escapeText(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
