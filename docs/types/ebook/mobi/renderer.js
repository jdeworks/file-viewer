// MOBI / AZW reader. Parses the container (mobilib), rewrites the book's <img recindex="N"> refs
// to inline data: URLs from the embedded image records (zero off-origin — no network fetch),
// DOMPurify-sanitizes the HTML, and renders in parentNode mode with an external sticky toolbar.
// DRM'd or HUFF/CDIC-compressed books show a clear, friendly note instead of garbage.
// Markup lives in sibling .html templates (error) filled via core/template.js.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { loadTemplate, fill, esc } from '../../../core/template.js';
import { openMobi } from './mobilib.js';

const ERROR = new URL('./error.html', import.meta.url);

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
  const clean = DOMPurify.sanitize(title + html, {
    ADD_ATTR: ['target'],
    ADD_DATA_URI_TAGS: ['img'],
    FORBID_TAGS: ['script', 'style', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });

  // ── Host + toolbar ──
  const host = document.createElement('div');
  host.className = 'mobi-reader mk-size-normal mk-font-serif mk-theme-light mk-line-normal mk-margin-normal';

  const toolbar = document.createElement('div');
  toolbar.className = 'mobi-toolbar';
  toolbar.setAttribute('aria-label', 'Reader settings');

  function mkGroup(label, opts) {
    const grp = document.createElement('div');
    grp.className = 'mobi-tb-group';
    const lbl = document.createElement('span');
    lbl.className = 'mobi-tb-label';
    lbl.textContent = label;
    grp.appendChild(lbl);
    opts.forEach(([text, cls], i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobi-tb-btn' + (i === 0 ? ' mk-active' : '');
      btn.textContent = text;
      btn.addEventListener('click', () => {
        opts.forEach(([, c]) => host.classList.remove(c));
        host.classList.add(cls);
        grp.querySelectorAll('.mobi-tb-btn').forEach((b) => b.classList.remove('mk-active'));
        btn.classList.add('mk-active');
      });
      grp.appendChild(btn);
    });
    return grp;
  }

  toolbar.append(
    mkGroup('Size',   [['A', 'mk-size-normal'], ['A+', 'mk-size-large']]),
    mkGroup('Font',   [['Serif', 'mk-font-serif'], ['Sans', 'mk-font-sans']]),
    mkGroup('Theme',  [['Light', 'mk-theme-light'], ['Sepia', 'mk-theme-sepia'], ['Dark', 'mk-theme-dark']]),
    mkGroup('Line',   [['Normal', 'mk-line-normal'], ['Loose', 'mk-line-loose']]),
    mkGroup('Margin', [['Normal', 'mk-margin-normal'], ['Wide', 'mk-margin-wide']]),
  );

  const book = document.createElement('div');
  book.className = 'mobi-book';
  book.innerHTML = clean;

  host.append(toolbar, book);
  return { parentNode: host };
}
