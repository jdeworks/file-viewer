// Comic book reader (parent pane — pages are image bytes, never executed). The first small reading
// window is available immediately; later pages are extracted as they approach the scroll viewport.
// A bounded blob-URL cache revokes distant pages and all remaining URLs on teardown.
import { COMIC_LIMITS, createComicPageCache, openComic, archiveKind } from './comiclib.js';
import { loadReaderPrefs, saveReaderPrefs } from '../../../core/reader-prefs.js';
import { COMIC_READER_PREFS } from '../reader-prefs.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, ctx) {
  const host = document.createElement('div');
  host.className = 'comic-doc';
  const enableArchiveWasm = !!(ctx && ctx.settings && ctx.settings.enableArchiveWasm);

  // For RAR/7z/tar comics, require WASM opt-in before trying to open.
  const kind = archiveKind(intake.bytes);
  if ((kind === 'rar' || kind === '7z' || kind === 'tar') && !enableArchiveWasm) {
    const what = kind === 'rar' ? 'RAR (.cbr)' : kind === '7z' ? '7-Zip (.cb7)' : 'Tar (.cbt)';
    const fname = esc(intake.filename || 'this comic');
    host.innerHTML = '<div class="comic-note"><strong>Archive support is not enabled.</strong><br>'
      + fname + ' is a ' + what + ' comic. Enable <strong>Archive support</strong> in '
      + 'Settings → Advanced to open it.</div>';
    return { parentNode: host };
  }

  let result;
  try { result = await openComic(intake, { enableArchiveWasm }); }
  catch (e) { host.innerHTML = '<div class="comic-note"><strong>Could not read comic</strong><br>' + esc(e.message) + '</div>'; return { parentNode: host }; }

  if (!result.pages) {
    // Reachable only for a truly unrecognized container (rar/7z/tar are already handled above,
    // either opened via WASM or stopped by the opt-in gate).
    host.innerHTML = '<div class="comic-note"><strong>This comic is an unrecognized archive.</strong><br>'
      + 'If this file is actually a zip, renaming it to <code>.cbz</code> will open it.</div>';
    return { parentNode: host };
  }

  const pages = result.pages;
  if (!pages.length) {
    host.innerHTML = '<div class="comic-note">No page images found in this comic archive.</div>';
    return { parentNode: host };
  }

  host.innerHTML =
    '<div class="comic-bar"><span class="comic-info"></span>'
    + '<button class="comic-setting comic-spread" type="button" title="Single page or two-page spread"></button>'
    + '<button class="comic-setting comic-fit" type="button" title="Fit pages to width or viewport"></button>'
    + '<button class="comic-setting comic-direction" type="button" title="Page order in spread mode"></button></div>'
    + '<div class="comic-pages"></div>';
  const pagesEl = host.querySelector('.comic-pages');
  const infoEl = host.querySelector('.comic-info');
  const spreadBtn = host.querySelector('.comic-spread');
  const fitBtn = host.querySelector('.comic-fit');
  const directionBtn = host.querySelector('.comic-direction');
  let readerPrefs = loadReaderPrefs(COMIC_READER_PREFS);

  function applyReaderPrefs() {
    const spread = readerPrefs.layout === 'spread';
    const fitPage = readerPrefs.fit === 'page';
    const rtl = readerPrefs.direction === 'rtl';
    host.classList.toggle('comic-spread-on', spread);
    host.classList.toggle('comic-fit-page', fitPage);
    host.classList.toggle('comic-rtl', rtl);
    pagesEl.dir = rtl ? 'rtl' : 'ltr';
    spreadBtn.classList.toggle('active', spread);
    fitBtn.classList.toggle('active', fitPage);
    directionBtn.classList.toggle('active', rtl);
    spreadBtn.setAttribute('aria-pressed', String(spread));
    fitBtn.setAttribute('aria-pressed', String(fitPage));
    directionBtn.setAttribute('aria-pressed', String(rtl));
    spreadBtn.textContent = spread ? '▣ Spread' : '▤ Single';
    fitBtn.textContent = fitPage ? '↕ Fit page' : '↔ Fit width';
    directionBtn.textContent = rtl ? '⇤ Right to left' : '⇥ Left to right';
  }

  function updateReaderPrefs(change) {
    readerPrefs = saveReaderPrefs(COMIC_READER_PREFS, { ...readerPrefs, ...change });
    applyReaderPrefs();
  }
  applyReaderPrefs();
  const totalPages = result.totalPages ?? pages.length;
  const failedPages = new Set();
  const pageViews = [];
  const loadTasks = new Map();
  let disposed = false;

  function refreshInfo() {
    const parts = [totalPages + ' page' + (totalPages === 1 ? '' : 's'), 'loads on demand'];
    parts.push('max ' + COMIC_LIMITS.maxActivePages + ' active / ' + Math.round(COMIC_LIMITS.maxActiveBytes / 1048576) + ' MB');
    parts.push(Math.round(COMIC_LIMITS.maxPageBytes / 1048576) + ' MB/page · ' + COMIC_LIMITS.maxConcurrentLoads + ' loads at a time');
    if (result.truncatedPages) parts.push('showing first ' + pages.length + ' (safety limit)');
    if (result.oversizedPages) parts.push(result.oversizedPages + ' over 64 MB blocked');
    const otherFailures = [...failedPages].filter((index) => !pages[index]?.tooLarge).length;
    if (otherFailures) parts.push(otherFailures + ' failed');
    infoEl.textContent = parts.join(' · ');
  }
  refreshInfo();

  for (let i = 0; i < pages.length; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'comic-page-wrap';
    // Reserve scroll geometry before extraction. Without this, thousands of empty wrappers would
    // all intersect at the top and defeat lazy loading before the first image established height.
    wrap.style.minHeight = 'min(70vh, 900px)';
    wrap.setAttribute('aria-label', 'Page ' + (i + 1));
    const status = document.createElement('span');
    status.className = 'comic-info';
    status.textContent = 'Page ' + (i + 1) + ' · scroll to load';
    const img = document.createElement('img');
    img.className = 'comic-page'; img.loading = 'lazy'; img.decoding = 'async'; img.alt = 'Page ' + (i + 1);
    wrap.append(status, img);
    pagesEl.appendChild(wrap);
    pageViews.push({ wrap, status, img, state: 'idle' });
  }

  const cache = createComicPageCache({
    onEvict(index) {
      const view = pageViews[index];
      if (!view) return;
      view.img.removeAttribute('src');
      view.state = 'idle';
      view.status.textContent = 'Page ' + (index + 1) + ' · scroll to reload';
      view.status.hidden = false;
    },
  });

  async function loadPage(index) {
    if (disposed || index < 0 || index >= pages.length) return;
    const view = pageViews[index];
    if (view.state === 'loaded') { cache.touch(index); return; }
    if (loadTasks.has(index)) return loadTasks.get(index);
    view.state = 'loading';
    view.status.textContent = 'Loading page ' + (index + 1) + '…';
    view.status.hidden = false;
    const task = cache.load(index, pages[index]).then((url) => {
      if (disposed) return;
      view.img.src = url;
      view.img.title = pages[index].name;
      view.state = 'loaded';
      view.status.hidden = true;
      failedPages.delete(index);
      refreshInfo();
    }).catch((error) => {
      if (disposed) return;
      view.state = 'error';
      failedPages.add(index);
      view.status.textContent = pages[index].tooLarge
        ? 'Page ' + (index + 1) + ' blocked by the 64 MB safety limit'
        : 'Page ' + (index + 1) + ' could not be loaded';
      view.status.title = error?.message || '';
      view.status.hidden = false;
      refreshInfo();
    }).finally(() => loadTasks.delete(index));
    loadTasks.set(index, task);
    return task;
  }

  // Keep the existing small-comic experience immediate while avoiding archive-wide expansion.
  for (let index = 0; index < Math.min(COMIC_LIMITS.initialPages, pages.length); index++) {
    await loadPage(index);
  }

  let observer = null;
  let scrollHandler = null;
  let resizeHandler = null;
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number(entry.target.dataset.comicPage);
        loadPage(index);
      }
    }, { root: pagesEl, rootMargin: '50% 0px' });
    pageViews.forEach((view, index) => {
      view.wrap.dataset.comicPage = String(index);
      observer.observe(view.wrap);
    });
  } else {
    // Geometry fallback for older embedded browsers without IntersectionObserver.
    let scheduled = false;
    const loadNearViewport = () => {
      scheduled = false;
      if (disposed) return;
      const rootRect = pagesEl.getBoundingClientRect();
      for (let index = 0; index < pageViews.length; index++) {
        const rect = pageViews[index].wrap.getBoundingClientRect();
        if (rect.bottom >= rootRect.top - rootRect.height / 2 && rect.top <= rootRect.bottom + rootRect.height / 2) loadPage(index);
      }
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(loadNearViewport);
    };
    scrollHandler = schedule;
    resizeHandler = schedule;
    pagesEl.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);
    setTimeout(schedule, 0);
  }

  spreadBtn.addEventListener('click', () => updateReaderPrefs({ layout: readerPrefs.layout === 'spread' ? 'single' : 'spread' }));
  fitBtn.addEventListener('click', () => updateReaderPrefs({ fit: readerPrefs.fit === 'page' ? 'width' : 'page' }));
  directionBtn.addEventListener('click', () => updateReaderPrefs({ direction: readerPrefs.direction === 'rtl' ? 'ltr' : 'rtl' }));

  return {
    parentNode: host,
    revoke: () => {
      if (disposed) return;
      disposed = true;
      observer?.disconnect();
      if (scrollHandler) pagesEl.removeEventListener('scroll', scrollHandler);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      cache.dispose();
      pages.length = 0;
    },
  };
}
