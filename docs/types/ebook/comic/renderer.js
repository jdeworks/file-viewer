// Comic book reader (parent pane — pages are image bytes, never executed). .cbz pages render as
// fit-to-width images in a vertical scroll, with a page counter and a two-page "spread" toggle
// (book mode) on wide screens. .cbr/.7z get a clear, friendly note (the RAR/7z readers are a
// planned opt-in). Blob URLs are revoked on teardown via the returned revoke().
import { openComic } from './comiclib.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, _ctx) {
  const host = document.createElement('div');
  host.className = 'comic-doc';

  let result;
  try { result = await openComic(intake); }
  catch (e) { host.innerHTML = '<div class="comic-note"><strong>Could not read comic</strong><br>' + esc(e.message) + '</div>'; return { parentNode: host }; }

  if (result.kind !== 'zip') {
    const what = result.kind === 'rar' ? 'a RAR archive (.cbr)' : result.kind === '7z' ? 'a 7-Zip archive (.cb7)' : 'an unrecognized archive';
    host.innerHTML = '<div class="comic-note"><strong>This comic is ' + what + '.</strong><br>'
      + 'Only <code>.cbz</code> (zip-based) comics open in the reader today. A RAR/7z reader is planned as an opt-in download. '
      + 'If this file is actually a zip, renaming it to <code>.cbz</code> will open it.</div>';
    return { parentNode: host };
  }

  const pages = result.pages;
  const urls = pages.map((p) => p.blobUrl);
  if (!pages.length) {
    host.innerHTML = '<div class="comic-note">No page images found in this comic archive.</div>';
    return { parentNode: host };
  }

  host.innerHTML =
    '<div class="comic-bar"><span class="comic-info"></span>'
    + '<button class="comic-spread" title="Two-page spread (book mode)">⊞ Spread</button></div>'
    + '<div class="comic-pages"></div>';
  const pagesEl = host.querySelector('.comic-pages');
  const infoEl = host.querySelector('.comic-info');
  infoEl.textContent = pages.length + ' page' + (pages.length === 1 ? '' : 's');

  for (let i = 0; i < pages.length; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'comic-page-wrap';
    const img = document.createElement('img');
    img.className = 'comic-page'; img.loading = 'lazy'; img.alt = 'Page ' + (i + 1);
    img.src = pages[i].blobUrl;
    wrap.appendChild(img);
    pagesEl.appendChild(wrap);
  }

  host.querySelector('.comic-spread').addEventListener('click', (e) => {
    const on = host.classList.toggle('comic-spread-on');
    e.currentTarget.classList.toggle('active', on);
  });

  return {
    parentNode: host,
    revoke: () => { for (const u of urls) URL.revokeObjectURL(u); },
  };
}
