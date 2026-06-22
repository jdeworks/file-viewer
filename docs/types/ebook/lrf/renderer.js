// Sony LRF (BBeB) reader. Parses the binary object stream (lrflib), then renders in the preview
// pane (parentNode) with the same reader chrome as EPUB: sidebar (title/author + size/font/theme
// prefs + page list) | reader (prev/next, position label, ←/→ keys). Reuses the `epub-*` CSS.
//
// Safety: every page's decoded HTML is DOMPurify-sanitized before it touches the DOM, and inline
// images come ONLY from the book's own ImageStream bytes as blob: URLs — there is no path for an
// off-origin request. DRM / unsupported files show a clear note instead of garbage.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { openLrf } from './lrflib.js';
import { loadState, saveState } from '../../../core/persistence.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'epub-doc lrf-doc';

  // .lrx is the encrypted Sony variant — refuse up front with a clear message.
  if (/\.lrx$/i.test(intake.filename || '')) {
    host.innerHTML = '<div class="comic-note"><strong>Sony LRX e-book (DRM)</strong><br>'
      + 'This is a DRM-protected Sony book (<code>.lrx</code>) and cannot be read. '
      + 'Unprotected <code>.lrf</code> books open here, as do EPUB, FB2, and MOBI.</div>';
    return { parentNode: host };
  }

  let book;
  try { book = await openLrf(intake.bytes); }
  catch (e) {
    host.innerHTML = '<div class="comic-note"><strong>Could not read LRF</strong><br>' + esc(e.message) + '</div>';
    return { parentNode: host };
  }
  if (!book.ok) {
    host.innerHTML = '<div class="comic-note"><strong>Sony LRF e-book (BBeB)</strong><br>' + esc(book.reason)
      + '<br>If you can convert it, EPUB, FB2, and MOBI all open in the reader here.</div>';
    return { parentNode: host };
  }

  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  const blobs = new Map();                 // image obj id → blob URL (revoked on destroy)

  function blobForRef(ref) {
    if (blobs.has(ref)) return blobs.get(ref);
    const img = book.imageCache.get(ref);
    if (!img) return null;
    const url = URL.createObjectURL(new Blob([img.bytes], { type: img.mime }));
    blobs.set(ref, url);
    return url;
  }

  // ── Layout (same structure/classes as the EPUB reader) ──
  host.innerHTML =
    '<aside class="epub-side">'
    + '<div class="epub-book"><div class="epub-title"></div><div class="epub-author"></div></div>'
    + '<div class="epub-prefs">'
    + '<div class="epub-pref-row"><span>Size</span><button class="epub-fs-dn" title="Smaller">A−</button><button class="epub-fs-up" title="Larger">A+</button></div>'
    + '<div class="epub-pref-row"><span>Font</span><button class="epub-font" data-font="serif">Serif</button><button class="epub-font" data-font="sans">Sans</button></div>'
    + '<div class="epub-pref-row"><span>Theme</span><button class="epub-theme" data-theme="light">Light</button><button class="epub-theme" data-theme="sepia">Sepia</button><button class="epub-theme" data-theme="dark">Dark</button></div>'
    + '</div>'
    + '<nav class="epub-toc"></nav></aside>'
    + '<div class="epub-main">'
    + '<div class="epub-bar"><button class="epub-menu" title="Reader settings and pages" aria-label="Reader settings and pages">☰</button><button class="epub-prev" title="Previous">‹ Prev</button>'
    + '<span class="epub-pos"></span>'
    + '<button class="epub-next" title="Next">Next ›</button></div>'
    + '<div class="epub-content" tabindex="0"></div></div>'
    + '<button class="epub-backdrop" type="button" aria-label="Close reader settings"></button>';

  host.querySelector('.epub-title').textContent = book.title || intake.filename;
  host.querySelector('.epub-author').textContent = book.author || '';
  const tocEl = host.querySelector('.epub-toc');
  const contentEl = host.querySelector('.epub-content');
  const posEl = host.querySelector('.epub-pos');

  // Reading preferences (shared with EPUB).
  const PREFS_KEY = 'fv:epub:prefs';
  const prefs = Object.assign({ fontSize: 18, font: 'serif', theme: 'light' }, readPrefs(PREFS_KEY));
  function applyPrefs() {
    contentEl.style.fontSize = prefs.fontSize + 'px';
    contentEl.style.fontFamily = prefs.font === 'sans' ? 'system-ui, sans-serif' : 'Georgia, "Times New Roman", serif';
    host.classList.remove('epub-theme-light', 'epub-theme-sepia', 'epub-theme-dark');
    host.classList.add('epub-theme-' + prefs.theme);
    for (const b of host.querySelectorAll('.epub-font')) b.classList.toggle('active', b.dataset.font === prefs.font);
    for (const b of host.querySelectorAll('.epub-theme')) b.classList.toggle('active', b.dataset.theme === prefs.theme);
    writePrefs(PREFS_KEY, prefs);
  }
  host.querySelector('.epub-fs-dn').addEventListener('click', () => { prefs.fontSize = Math.max(12, prefs.fontSize - 1); applyPrefs(); });
  host.querySelector('.epub-fs-up').addEventListener('click', () => { prefs.fontSize = Math.min(32, prefs.fontSize + 1); applyPrefs(); });
  for (const b of host.querySelectorAll('.epub-font')) b.addEventListener('click', () => { prefs.font = b.dataset.font; applyPrefs(); });
  for (const b of host.querySelectorAll('.epub-theme')) b.addEventListener('click', () => { prefs.theme = b.dataset.theme; applyPrefs(); });
  applyPrefs();

  // Page list (the "TOC" — one entry per Page).
  book.pages.forEach((pg, i) => {
    const a = document.createElement('a');
    a.className = 'epub-toc-item';
    a.textContent = 'Page ' + (i + 1);
    a.href = '#';
    a._spine = i;
    a.addEventListener('click', (e) => { e.preventDefault(); show(i); });
    tocEl.appendChild(a);
  });

  let current = -1;

  function show(index) {
    if (index < 0 || index >= book.pages.length) return;
    current = index;
    const pg = book.pages[index];
    // Sanitize into an inert fragment, then swap plot placeholders for in-book blob: URLs.
    const frag = DOMPurify.sanitize(pg.html || '<p class="epub-empty">(blank page)</p>', {
      FORBID_TAGS: ['script', 'style', 'link', 'meta'],
      FORBID_ATTR: ['srcset', 'onerror', 'onload', 'onclick'],
      ADD_ATTR: ['data-ref'],
      RETURN_DOM_FRAGMENT: true,
    });
    for (const img of frag.querySelectorAll('img.lrf-plot')) {
      const ref = parseInt(img.getAttribute('data-ref'), 10);
      const url = ref ? blobForRef(ref) : null;
      if (url) { img.src = url; img.removeAttribute('data-ref'); }
      else img.remove();                                 // not in book → never request off-origin
    }
    const flow = document.createElement('div');
    flow.className = 'epub-flow';
    flow.appendChild(frag);
    contentEl.innerHTML = '';
    contentEl.appendChild(flow);

    for (const a of tocEl.children) a.classList.toggle('active', a._spine === index);
    posEl.textContent = (index + 1) + ' / ' + book.pages.length;
    contentEl.scrollTop = 0;
    persist();
  }

  function persist() { saveState(intake, { kind: 'lrf', page: current }); }

  host.querySelector('.epub-prev').addEventListener('click', () => show(current - 1));
  host.querySelector('.epub-next').addEventListener('click', () => show(current + 1));
  host.querySelector('.epub-menu').addEventListener('click', () => host.classList.toggle('epub-side-open'));
  host.querySelector('.epub-backdrop').addEventListener('click', () => host.classList.remove('epub-side-open'));
  tocEl.addEventListener('click', () => host.classList.remove('epub-side-open'));
  contentEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });

  const saved = loadState(intake);
  const startAt = saved && saved.kind === 'lrf' && saved.page >= 0 && saved.page < book.pages.length ? saved.page : 0;
  show(startAt);

  return {
    parentNode: host,
    revoke: () => { for (const url of blobs.values()) URL.revokeObjectURL(url); blobs.clear(); },
  };
}

function readPrefs(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function writePrefs(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }
