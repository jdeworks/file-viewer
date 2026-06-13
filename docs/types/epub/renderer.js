// EPUB reader. Renders directly in the preview pane (parentNode) — NOT the sandboxed iframe —
// because we need blob: URLs for embedded images, which the opaque-origin sandbox can't reach.
// Safety: every chapter's XHTML is DOMPurify-sanitized (scripts/handlers stripped) before it
// touches the DOM, and we rewrite EVERY resource reference to a blob: URL built from a zip
// entry — any reference that doesn't resolve inside the book is removed, so a malicious or
// sloppy EPUB can never make an off-origin request (the trust guarantee holds).
//
// One chapter (spine item) is shown at a time — books are large. A sidebar TOC + prev/next
// navigate; the reading position (chapter + scroll) is remembered per file via persistence.
import { loadGlobal, vendor } from '../../core/script-loader.js';
import { parseEpub, resolvePath, splitFrag, guessMime } from './epublib.js';
import { fingerprint, loadState, saveState } from '../../core/persistence.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'epub-doc';

  let book;
  try { book = await parseEpub(intake); }
  catch (e) {
    host.innerHTML = '<div class="json-error"><strong>Could not read EPUB</strong><br>' + esc(e.message) + '</div>';
    return { parentNode: host };
  }

  const DOMPurify = await loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify');
  const blobs = new Map();                 // zip path → blob URL (created lazily, revoked on destroy)
  const fp = fingerprint(intake);

  // spine path → index, for resolving TOC + internal links to a chapter.
  const spineIndex = new Map(book.spine.map((s, i) => [s.path, i]));

  // ── Layout: sidebar (title + reading settings + TOC) | reader (toolbar + content) ──
  host.innerHTML =
    '<aside class="epub-side">'
    + '<div class="epub-book"><div class="epub-title"></div><div class="epub-author"></div></div>'
    + '<div class="epub-prefs">'
    + '<div class="epub-pref-row"><span>Size</span><button class="epub-fs-dn" title="Smaller">A−</button><button class="epub-fs-up" title="Larger">A+</button></div>'
    + '<div class="epub-pref-row"><span>Font</span><button class="epub-font" data-font="serif">Serif</button><button class="epub-font" data-font="sans">Sans</button></div>'
    + '<div class="epub-pref-row"><span>Theme</span><button class="epub-theme" data-theme="light">Light</button><button class="epub-theme" data-theme="sepia">Sepia</button><button class="epub-theme" data-theme="dark">Dark</button></div>'
    + '<div class="epub-pref-row epub-cols-row"><span>Columns</span><button class="epub-cols" data-cols="1">1</button><button class="epub-cols" data-cols="2">2</button></div>'
    + '</div>'
    + '<nav class="epub-toc"></nav></aside>'
    + '<div class="epub-main">'
    + '<div class="epub-bar"><button class="epub-prev" title="Previous">‹ Prev</button>'
    + '<span class="epub-pos"></span>'
    + '<button class="epub-next" title="Next">Next ›</button></div>'
    + '<div class="epub-content" tabindex="0"></div></div>';

  host.querySelector('.epub-title').textContent = book.title || intake.filename;
  host.querySelector('.epub-author').textContent = book.creator || '';
  const tocEl = host.querySelector('.epub-toc');
  const contentEl = host.querySelector('.epub-content');
  const posEl = host.querySelector('.epub-pos');

  // Reading preferences (global, shared across books) — size/font/theme. Zoom changes the real
  // font-size (not a transform), so text stays crisp and reflows.
  const PREFS_KEY = 'fv:epub:prefs';
  const prefs = Object.assign({ fontSize: 18, font: 'serif', theme: 'light', columns: 1 }, readPrefs(PREFS_KEY));
  function applyPrefs() {
    contentEl.style.fontSize = prefs.fontSize + 'px';
    contentEl.style.fontFamily = prefs.font === 'sans' ? 'system-ui, sans-serif' : 'Georgia, "Times New Roman", serif';
    host.classList.remove('epub-theme-light', 'epub-theme-sepia', 'epub-theme-dark');
    host.classList.add('epub-theme-' + prefs.theme);
    host.classList.toggle('epub-twocol', prefs.columns === 2);   // two-column reading (wide screens)
    for (const b of host.querySelectorAll('.epub-font')) b.classList.toggle('active', b.dataset.font === prefs.font);
    for (const b of host.querySelectorAll('.epub-theme')) b.classList.toggle('active', b.dataset.theme === prefs.theme);
    for (const b of host.querySelectorAll('.epub-cols')) b.classList.toggle('active', Number(b.dataset.cols) === prefs.columns);
    writePrefs(PREFS_KEY, prefs);
  }
  host.querySelector('.epub-fs-dn').addEventListener('click', () => { prefs.fontSize = Math.max(12, prefs.fontSize - 1); applyPrefs(); });
  host.querySelector('.epub-fs-up').addEventListener('click', () => { prefs.fontSize = Math.min(32, prefs.fontSize + 1); applyPrefs(); });
  for (const b of host.querySelectorAll('.epub-font')) b.addEventListener('click', () => { prefs.font = b.dataset.font; applyPrefs(); });
  for (const b of host.querySelectorAll('.epub-theme')) b.addEventListener('click', () => { prefs.theme = b.dataset.theme; applyPrefs(); });
  for (const b of host.querySelectorAll('.epub-cols')) b.addEventListener('click', () => { prefs.columns = Number(b.dataset.cols); applyPrefs(); });
  applyPrefs();

  // Build the TOC list.
  for (const entry of book.toc) {
    const idx = spineIndex.has(entry.path) ? spineIndex.get(entry.path) : nearestSpine(entry.path);
    const a = document.createElement('a');
    a.className = 'epub-toc-item';
    a.textContent = entry.label;
    a.href = '#';
    a.addEventListener('click', (e) => { e.preventDefault(); if (idx != null) show(idx, entry.frag); });
    a._spine = idx;
    tocEl.appendChild(a);
  }

  function nearestSpine(path) {
    // TOC may point at a file that's part of the spine under a slightly different path; try a
    // suffix match before giving up.
    if (spineIndex.has(path)) return spineIndex.get(path);
    for (const [p, i] of spineIndex) if (p.endsWith(path) || path.endsWith(p)) return i;
    return null;
  }

  function blobFor(path, mime) {
    if (blobs.has(path)) return blobs.get(path);
    return null;
  }
  async function ensureBlob(path, mime) {
    if (blobs.has(path)) return blobs.get(path);
    const u8 = await book.readU8(path);
    if (!u8) return null;
    const url = URL.createObjectURL(new Blob([u8], { type: mime }));
    blobs.set(path, url);
    return url;
  }

  let current = -1;

  async function show(index, frag) {
    if (index < 0 || index >= book.spine.length) return;
    current = index;
    const item = book.spine[index];
    const xhtml = await book.readText(item.path);
    contentEl.innerHTML = '';
    if (xhtml == null) { contentEl.innerHTML = '<p class="epub-empty">(chapter unavailable)</p>'; return; }

    // Parse → take <body> → sanitize → rewrite resources to in-book blob URLs.
    let bodyHtml;
    try {
      const doc = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
      const body = doc.querySelector('body') || doc.documentElement;
      bodyHtml = body ? body.innerHTML : xhtml;
    } catch { bodyHtml = xhtml; }
    // Sanitize into an INERT DocumentFragment: its nodes aren't connected to the page, so
    // images don't start loading until we've rewritten every src to an in-book blob URL (or
    // removed it). Rewriting a live <img src="..."> would eagerly hit the origin first.
    const frag2 = DOMPurify.sanitize(bodyHtml, {
      FORBID_TAGS: ['script', 'link', 'style'], FORBID_ATTR: ['srcset'], RETURN_DOM_FRAGMENT: true,
    });
    await rewriteResources(frag2, item.path);
    // Wrap in an inner flow element so two-column mode (CSS columns) balances within the chapter
    // while the outer .epub-content keeps scrolling vertically (no horizontal column overflow).
    const flow = document.createElement('div');
    flow.className = 'epub-flow';
    flow.appendChild(frag2);
    contentEl.appendChild(flow);

    // Highlight active TOC entry + position label.
    for (const a of tocEl.children) a.classList.toggle('active', a._spine === index);
    posEl.textContent = (index + 1) + ' / ' + book.spine.length;

    // Scroll to fragment anchor or top, then remember the position.
    const target = frag && contentEl.querySelector('#' + cssEscape(frag) + ', [name="' + frag + '"]');
    if (target) target.scrollIntoView(); else contentEl.scrollTop = 0;
    persist();
  }

  // Rewrite img/svg-image/source resource refs to blob: URLs from the zip; remove anything not
  // in the book. Internal <a> become chapter navigations; external links open in a new tab.
  async function rewriteResources(root, chapterPath) {
    for (const img of root.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      img.removeAttribute('srcset');
      const path = src && resolvePath(chapterPath, src);
      if (path) { const url = await ensureBlob(path, guessMime(path)); if (url) { img.src = url; continue; } }
      img.removeAttribute('src');                 // not in book → never request off-origin
    }
    for (const im of root.querySelectorAll('image')) {
      const href = im.getAttribute('xlink:href') || im.getAttribute('href');
      const path = href && resolvePath(chapterPath, href);
      im.removeAttribute('xlink:href'); im.removeAttribute('href');
      if (path) { const url = await ensureBlob(path, guessMime(path)); if (url) im.setAttribute('href', url); }
    }
    for (const a of root.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (/^[a-z]+:/i.test(href) && !/^blob:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; continue; }
      const { path, frag } = splitFrag(href);
      const abs = resolvePath(chapterPath, path);
      const idx = abs && nearestSpine(abs);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (idx != null && idx >= 0) show(idx, frag);
        else if (frag) { const t = contentEl.querySelector('#' + cssEscape(frag)); if (t) t.scrollIntoView(); }
      });
    }
  }

  function persist() { if (fp) saveState(intake, { kind: 'epub', chapter: current, scrollTop: contentEl.scrollTop }); }
  contentEl.addEventListener('scroll', debounce(persist, 400));

  host.querySelector('.epub-prev').addEventListener('click', () => show(current - 1));
  host.querySelector('.epub-next').addEventListener('click', () => show(current + 1));
  contentEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'ArrowLeft') show(current - 1);
  });

  // Resume where we left off, else start at the beginning.
  const saved = loadState(intake);
  const startAt = saved && saved.kind === 'epub' && saved.chapter >= 0 && saved.chapter < book.spine.length ? saved.chapter : 0;
  await show(startAt);
  if (saved && saved.scrollTop) contentEl.scrollTop = saved.scrollTop;

  return {
    parentNode: host,
    revoke: () => { for (const url of blobs.values()) URL.revokeObjectURL(url); blobs.clear(); },
  };
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function cssEscape(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^\w-]/g, '\\$&'); }
function readPrefs(key) { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } }
function writePrefs(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }
