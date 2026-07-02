// Comic book reader (parent pane — pages are image bytes, never executed). .cbz pages render as
// fit-to-width images in a vertical scroll, with a page counter and a two-page "spread" toggle
// (book mode) on wide screens. .cbr/.cb7/.cbt open via libarchive.wasm when enableArchiveWasm is
// on (libarchive.js handles RAR, 7-Zip, and tar alike); otherwise a friendly opt-in note is
// shown. Blob URLs are revoked on teardown via revoke().
import { openComic, archiveKind } from './comiclib.js';

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
