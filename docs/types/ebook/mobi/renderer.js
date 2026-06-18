// MOBI / AZW reader. Parses the container (mobilib), rewrites the book's <img recindex="N"> refs
// to inline data: URLs from the embedded image records (zero off-origin — no network fetch),
// DOMPurify-sanitizes the HTML, and renders it via the shared sandboxed iframe like FB2/Markdown.
// DRM'd or HUFF/CDIC-compressed books show a clear, friendly note instead of garbage.
// Markup lives in sibling .html templates (error) filled via core/template.js.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { loadTemplate, fill, esc } from '../../../core/template.js';
import { openMobi } from './mobilib.js';

const ERROR = new URL('./error.html', import.meta.url);

function readerShell(content) {
  return '<div class="ebook-reader mobi-reader">'
    + '<input class="ebook-choice ebook-size-normal" id="mobi-size-normal" name="mobi-size" type="radio" checked>'
    + '<input class="ebook-choice ebook-size-large" id="mobi-size-large" name="mobi-size" type="radio">'
    + '<input class="ebook-choice ebook-font-serif" id="mobi-font-serif" name="mobi-font" type="radio" checked>'
    + '<input class="ebook-choice ebook-font-sans" id="mobi-font-sans" name="mobi-font" type="radio">'
    + '<input class="ebook-choice ebook-theme-light" id="mobi-theme-light" name="mobi-theme" type="radio" checked>'
    + '<input class="ebook-choice ebook-theme-sepia" id="mobi-theme-sepia" name="mobi-theme" type="radio">'
    + '<input class="ebook-choice ebook-theme-dark" id="mobi-theme-dark" name="mobi-theme" type="radio">'
    + '<div class="ebook-controls" aria-label="Reader settings">'
    + '<label for="mobi-size-normal">A</label><label for="mobi-size-large">A+</label>'
    + '<label for="mobi-font-serif">Serif</label><label for="mobi-font-sans">Sans</label>'
    + '<label for="mobi-theme-light">Light</label><label for="mobi-theme-sepia">Sepia</label><label for="mobi-theme-dark">Dark</label>'
    + '</div>' + content + '</div>';
}

export async function render(intake, _ctx) {
  const result = openMobi(intake.bytes);
  if (!result.ok) {
    const errorTpl = await loadTemplate(ERROR);
    return { bodyHtml: fill(errorTpl, { reason: result.reason }), hadUnsafe: false };
  }
  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');

  // Rewrite <img recindex="N"> (MOBI's image reference) to the inline data: URL for that record.
  let html = result.html.replace(/<img\b[^>]*?recindex=["']?0*(\d+)["']?[^>]*>/gi, (m, n) => {
    const src = result.images.get(parseInt(n, 10));
    return src ? '<img class="mobi-img" src="' + src + '" alt="">' : '';
  });
  // MOBI page breaks → horizontal rules; drop the publisher's <guide>/<mbp:*> cruft.
  html = html.replace(/<mbp:pagebreak\s*\/?>/gi, '<hr class="mobi-break">').replace(/<\/?mbp:[^>]*>/gi, '');

  const title = result.title ? '<header class="mobi-head"><h1 class="mobi-booktitle">' + esc(result.title) + '</h1></header>' : '';
  DOMPurify.removed = [];
  const clean = DOMPurify.sanitize('<article class="mobi-book">' + title + html + '</article>', {
    ADD_ATTR: ['target'],
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: ['script', 'style', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
  return { bodyHtml: readerShell(clean), hadUnsafe: DOMPurify.removed.length > 0 };
}
