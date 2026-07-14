// PDF viewer + lite editor. Pages are rendered to images with pdf.js (which PARSES, never
// executes, the PDF) directly in the parent pane, so we can attach edit controls. Default is a
// clean read-only view; an Edit toggle reveals per-page rotate / move / delete, and edits (via
// pdf-lib, lazy-loaded) produce a new PDF you can download. The original bytes are never mutated.
//
// Password-protected PDFs: pdf.js throws PasswordException (name === 'PasswordException') with
// code 1 (NEED_PASSWORD) on first open, or code 2 (INCORRECT_PASSWORD) on a wrong retry.
// We catch these and show an inline password prompt (showPasswordPrompt) in the host element,
// then retry getDocument with the supplied password until success or cancellation.
import { loadPdfjs } from './pdflib.js';
import { createEditor } from './pdfedit.js';
import { showPasswordPrompt } from '../../core/password-prompt.js';
import { loadGlobal, vendor } from '../../core/script-loader.js';

const MAX_PAGES = 50;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function byteText(bytes, start, length) {
  if (!(bytes instanceof Uint8Array) || start < 0 || start >= bytes.length) return '';
  return String.fromCharCode(...bytes.subarray(start, Math.min(bytes.length, start + length)));
}

export function pdfFailureDiagnostics(intake, error = null) {
  const bytes = intake?.bytes;
  const diagnostics = [];
  if (intake?.truncated || (Number.isFinite(intake?.size) && bytes?.length < intake.size)) {
    diagnostics.push(`Only ${Number(intake.loadedBytes || bytes?.length || 0).toLocaleString()} of ${Number(intake.size || 0).toLocaleString()} bytes were loaded. PDF cross-reference data is normally near the end, so a prefix cannot be rendered reliably.`);
  }

  const head = byteText(bytes, 0, Math.min(1024, bytes?.length || 0));
  if (!head.includes('%PDF-')) diagnostics.push('The required %PDF- header was not found in the first 1,024 bytes.');

  if (!intake?.truncated && bytes?.length) {
    const tailStart = Math.max(0, bytes.length - 4096);
    if (!byteText(bytes, tailStart, bytes.length - tailStart).includes('%%EOF')) {
      diagnostics.push('The %%EOF trailer is missing; the file may be truncated or was not completely written.');
    }
  }

  const parserMessage = String(error?.message || error || '').replace(/\s+/g, ' ').trim();
  if (parserMessage) diagnostics.push(`PDF parser report: ${parserMessage.slice(0, 300)}`);
  diagnostics.push('The viewer did not modify or execute the PDF; the original bytes remain available for download.');
  return [...new Set(diagnostics)];
}

// Rasterize any image file (PNG/JPEG/WebP/GIF/SVG) to PNG bytes via a canvas, so pdf-lib (which
// embeds only PNG/JPEG) can place it. Pure in-browser; the image is never uploaded.
function imageFileToPngBytes(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1024; canvas.height = img.naturalHeight || 768;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) return reject(new Error('this browser could not rasterize the image'));
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not load the image')); };
    img.src = url;
  });
}

export async function render(intake, ctx) {
  if (intake.truncated || (Number.isFinite(intake.size) && intake.bytes?.length < intake.size)) {
    const diagnostics = pdfFailureDiagnostics(intake);
    return {
      bodyHtml: '<div class="json-error"><strong>Incomplete PDF input</strong><ul>'
        + diagnostics.map((message) => '<li>' + esc(message) + '</li>').join('') + '</ul></div>',
      hadUnsafe: false,
    };
  }
  let scale = ctx?.settings?.pdfScale || 1.5;
  const ZOOM_STEP = 0.25, ZOOM_MIN = 0.5, ZOOM_MAX = 4;
  const host = document.createElement('div');
  host.className = 'pdf-doc';
  host.innerHTML =
    '<div class="pdf-bar"><span class="pdf-info"></span>'
    + '<span class="pdf-zoom-ctl">'
    + '<button class="pdf-zoom-out" title="Zoom out">−</button>'
    + '<span class="pdf-zoom-pct">150%</span>'
    + '<button class="pdf-zoom-in" title="Zoom in">+</button>'
    + '</span>'
    + '<button class="pdf-viewmode" title="Switch between continuous and single-page view">Single page</button>'
    + '<span class="pdf-page-nav" hidden>'
    + '<button class="pdf-page-prev" title="Previous page">‹</button>'
    + '<span class="pdf-page-status">1 / 1</span>'
    + '<button class="pdf-page-next" title="Next page">›</button>'
    + '</span>'
    + '<button class="pdf-spread" title="Two-page spread (book mode)">⊞ Spread</button>'
    + '<button class="pdf-edit" title="Edit pages">Edit</button>'
    + '<button class="pdf-addblank" hidden title="Add a blank A4 page">+ Blank page</button>'
    + '<button class="pdf-addimg" hidden title="Add an image as a new page">+ Image page</button>'
    + '<button class="pdf-merge" hidden title="Append another PDF">+ Merge PDF</button>'
    + '<button class="pdf-watermark" hidden title="Add a text watermark to all pages">Watermark</button>'
    + '<button class="pdf-extract" hidden title="Extract a range of pages to a new PDF">Extract pages</button>'
    + '<button class="pdf-split" hidden title="Split PDF into multiple files by page ranges">Split PDF</button>'
    + '<button class="pdf-download" hidden>Download edited PDF</button></div>'
    + '<div class="pdf-changes" hidden></div>'
    + '<div class="pdf-watermark-form" hidden style="padding:4px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
    + '<input class="pdf-wm-text" type="text" value="DRAFT" placeholder="Watermark text" style="width:120px">'
    + '<label style="font-size:0.85em">Opacity <input class="pdf-wm-opacity" type="range" min="0.05" max="1" step="0.05" value="0.3" style="width:80px"></label>'
    + '<button class="pdf-wm-apply">Apply watermark</button>'
    + '<button class="pdf-wm-clear">Clear</button>'
    + '</div>'
    + '<div class="pdf-extract-form" hidden style="padding:4px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
    + '<label style="font-size:0.85em">Pages <input class="pdf-ex-from" type="number" min="1" value="1" style="width:52px"> – <input class="pdf-ex-to" type="number" min="1" value="1" style="width:52px"></label>'
    + '<button class="pdf-ex-apply">Extract</button>'
    + '<button class="pdf-ex-cancel">Cancel</button>'
    + '</div>'
    + '<div class="pdf-split-form" hidden style="padding:4px 8px;display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;">'
    + '<div style="display:flex;flex-direction:column;gap:4px;">'
    + '<label style="font-size:0.85em">Page ranges (one per line, e.g. <code>1-3</code>)</label>'
    + '<textarea class="pdf-split-ranges" rows="4" style="width:180px;font-family:monospace;font-size:0.85em;"></textarea>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:4px;align-self:center;">'
    + '<button class="pdf-split-apply">Split &amp; Download</button>'
    + '<button class="pdf-split-cancel">Cancel</button>'
    + '</div>'
    + '</div>'
    + '<input type="file" class="pdf-imginput" accept="image/*" hidden>'
    + '<input type="file" class="pdf-pdfinput" accept="application/pdf,.pdf" hidden>'
    + '<div class="pdf-pages"></div>';
  const pagesEl = host.querySelector('.pdf-pages');
  const infoEl = host.querySelector('.pdf-info');
  const changesEl = host.querySelector('.pdf-changes');

  // Password state — retained across re-renders (e.g. after edits) so the user doesn't need to
  // re-enter it. Cleared to null if the document is replaced (not applicable in current flow).
  let unlockPassword = null;

  let editor = null, editing = false, dirty = false, currentBytes = intake.bytes;
  let viewMode = 'continuous', currentPage = 0, renderedPageCount = 0;

  function updatePageMode() {
    currentPage = Math.min(Math.max(currentPage, 0), Math.max(renderedPageCount - 1, 0));
    const single = viewMode === 'single';
    host.classList.toggle('pdf-single-on', single);
    host.querySelector('.pdf-viewmode').classList.toggle('active', single);
    host.querySelector('.pdf-viewmode').textContent = single ? 'Continuous' : 'Single page';
    host.querySelector('.pdf-page-nav').hidden = !single || renderedPageCount <= 1;
    host.querySelector('.pdf-page-prev').disabled = currentPage <= 0;
    host.querySelector('.pdf-page-next').disabled = currentPage >= renderedPageCount - 1;
    host.querySelector('.pdf-page-status').textContent = (currentPage + 1) + ' / ' + Math.max(renderedPageCount, 1);
    pagesEl.querySelectorAll('.pdf-page-wrap').forEach((wrap, index) => {
      wrap.hidden = single && index !== currentPage;
    });
  }

  function goToPage(delta) {
    if (viewMode !== 'single') return false;
    const next = Math.min(Math.max(currentPage + delta, 0), Math.max(renderedPageCount - 1, 0));
    if (next === currentPage) return false;
    currentPage = next;
    updatePageMode();
    return true;
  }

  async function renderPages(bytes) {
    const lib = await loadPdfjs();
    // pdf.js throws PasswordException (name === 'PasswordException') for encrypted PDFs:
    //   code 1 (NEED_PASSWORD)      — first attempt, no password supplied
    //   code 2 (INCORRECT_PASSWORD) — wrong password was provided
    // We show an inline overlay prompt and retry until the user succeeds or cancels.
    let doc;
    while (true) {
      try {
        doc = await lib.getDocument({ data: bytes.slice(), password: unlockPassword ?? undefined }).promise;
        break; // success
      } catch (err) {
        if (err?.name !== 'PasswordException') throw err;
        // Show a full-size password prompt overlay on top of the (empty) pdf-doc host.
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;inset:0;background:var(--bg,#fff);z-index:10;display:flex;flex-direction:column;';
        host.style.position = 'relative';
        host.appendChild(overlay);
        const hint = unlockPassword !== null ? 'Incorrect password — please try again.' : '';
        const password = await showPasswordPrompt(overlay, {
          filename: intake.filename || intake.name || 'document.pdf',
          hint,
          signal: ctx?.signal,
        });
        if (overlay.parentNode === host) host.removeChild(overlay);
        if (ctx?.signal?.aborted) return;
        if (password === null) {
          // User cancelled — show a neutral note.
          pagesEl.innerHTML = '<p class="pdf-note" style="padding:20px;color:var(--fg-2,#888)">Password required to view this file.</p>';
          infoEl.textContent = 'password required';
          return;
        }
        unlockPassword = password;
        // Loop to retry with the new password.
      }
    }
    try {
      const max = Math.min(doc.numPages, MAX_PAGES);
      renderedPageCount = max;
      pagesEl.innerHTML = '';
      for (let i = 1; i <= max; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const wrap = document.createElement('div');
        wrap.className = 'pdf-page-wrap';
        wrap.dataset.pageIndex = String(i - 1);
        const img = document.createElement('img');
        img.className = 'pdf-page'; img.alt = 'Page ' + i; img.src = canvas.toDataURL('image/png');
        canvas.width = canvas.height = 0;
        page.cleanup();
        wrap.appendChild(img);
        if (editing) wrap.appendChild(pageControls(i - 1));
        pagesEl.appendChild(wrap);
      }
      if (doc.numPages > max) { const n = document.createElement('p'); n.className = 'pdf-note'; n.textContent = 'Showing first ' + max + ' of ' + doc.numPages + ' pages.'; pagesEl.appendChild(n); }
      updatePageMode();
      infoEl.textContent = doc.numPages + ' page' + (doc.numPages === 1 ? '' : 's') + (editing ? ' · editing' : '') + (dirty ? ' · modified' : '');
    } finally {
      // pdf.js holds a worker + buffers per document; every edit/merge re-renders, so destroy the
      // proxy each time or workers/memory pile up across a session and renders start failing.
      try { await doc.destroy(); } catch { /* already gone */ }
    }
  }

  function pageControls(pos) {
    const bar = document.createElement('div');
    bar.className = 'pdf-pagectl';
    bar.innerHTML = '<button data-act="rl" title="Rotate left">⟲</button>'
      + '<button data-act="rr" title="Rotate right">⟳</button>'
      + '<button data-act="up" title="Move up">↑</button>'
      + '<button data-act="dn" title="Move down">↓</button>'
      + '<button data-act="del" title="Delete page">✕</button>';
    bar.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act; if (!act) return;
      applyEdit(() => {
        if (act === 'rl') editor.rotate(pos, -90);
        else if (act === 'rr') editor.rotate(pos, 90);
        else if (act === 'up') editor.move(pos, -1);
        else if (act === 'dn') editor.move(pos, 1);
        else if (act === 'del') editor.remove(pos);
      });
    });
    return bar;
  }

  function updateChanges() {
    const list = editor ? editor.changes() : [];
    if (!list.length) { changesEl.hidden = true; changesEl.innerHTML = ''; return; }
    changesEl.hidden = false;
    changesEl.innerHTML = '<strong>Changes:</strong> ' + list.map(esc).join(' · ');
  }

  async function applyEdit(mutate) {
    await mutate();                       // mutate may be async (e.g. merging another PDF)
    dirty = true;
    host.querySelector('.pdf-download').hidden = false;
    currentBytes = await editor.build();
    ctx?.onBinaryEdit?.({
      dirty: true,
      mimeType: 'application/pdf',
      getBytes: async () => currentBytes.slice(),
    });
    updateChanges();
    await renderPages(currentBytes);
  }

  host.querySelector('.pdf-edit').addEventListener('click', async () => {
    editing = !editing;
    host.querySelector('.pdf-edit').classList.toggle('active', editing);
    host.querySelector('.pdf-addblank').hidden = !editing;
    host.querySelector('.pdf-addimg').hidden = !editing;
    host.querySelector('.pdf-merge').hidden = !editing;
    host.querySelector('.pdf-watermark').hidden = !editing;
    host.querySelector('.pdf-extract').hidden = !editing;
    host.querySelector('.pdf-split').hidden = !editing;
    if (!editing) {
      host.querySelector('.pdf-watermark-form').hidden = true;
      host.querySelector('.pdf-extract-form').hidden = true;
      host.querySelector('.pdf-split-form').hidden = true;
    }
    if (editing && !editor) {
      try { editor = await createEditor(intake.bytes); }
      catch (e) {
        infoEl.textContent = 'Editing unavailable: ' + esc(e.message);
        editing = false;
        host.querySelector('.pdf-edit').classList.remove('active');
        host.querySelector('.pdf-addblank').hidden = true;
        host.querySelector('.pdf-addimg').hidden = true;
        host.querySelector('.pdf-merge').hidden = true;
        host.querySelector('.pdf-watermark').hidden = true;
        host.querySelector('.pdf-extract').hidden = true;
        host.querySelector('.pdf-split').hidden = true;
        return;
      }
    }
    await renderPages(currentBytes);
  });

  // Two-page spread (book mode): lay pages out two-up on wide screens. Pure CSS toggle; the
  // media query in app.css keeps it single-page on phones. Independent of edit mode.
  host.querySelector('.pdf-spread').addEventListener('click', (e) => {
    const on = host.classList.toggle('pdf-spread-on');
    e.currentTarget.classList.toggle('active', on);
  });

  host.querySelector('.pdf-viewmode').addEventListener('click', () => {
    viewMode = viewMode === 'single' ? 'continuous' : 'single';
    if (viewMode === 'single') {
      host.classList.remove('pdf-spread-on');
      host.querySelector('.pdf-spread').classList.remove('active');
    }
    updatePageMode();
  });
  host.querySelector('.pdf-page-prev').addEventListener('click', () => {
    goToPage(-1);
  });
  host.querySelector('.pdf-page-next').addEventListener('click', () => {
    goToPage(1);
  });
  host.tabIndex = 0;
  host.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || viewMode !== 'single') return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      if (goToPage(-1)) e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      if (goToPage(1)) e.preventDefault();
    }
  });
  let touchStartX = null, touchStartY = null;
  pagesEl.addEventListener('touchstart', (e) => {
    if (viewMode !== 'single' || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  pagesEl.addEventListener('touchend', (e) => {
    if (viewMode !== 'single' || touchStartX == null || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    touchStartX = touchStartY = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    goToPage(dx < 0 ? 1 : -1);
  }, { passive: true });

  // Inline zoom controls — re-render pages at the new scale.
  function updateZoomPct() {
    host.querySelector('.pdf-zoom-pct').textContent = Math.round(scale * 100) + '%';
    host.querySelector('.pdf-zoom-out').disabled = scale <= ZOOM_MIN;
    host.querySelector('.pdf-zoom-in').disabled = scale >= ZOOM_MAX;
  }
  host.querySelector('.pdf-zoom-out').addEventListener('click', async () => {
    if (scale <= ZOOM_MIN) return;
    scale = Math.max(ZOOM_MIN, +(scale - ZOOM_STEP).toFixed(2));
    updateZoomPct();
    await renderPages(currentBytes);
  });
  host.querySelector('.pdf-zoom-in').addEventListener('click', async () => {
    if (scale >= ZOOM_MAX) return;
    scale = Math.min(ZOOM_MAX, +(scale + ZOOM_STEP).toFixed(2));
    updateZoomPct();
    await renderPages(currentBytes);
  });
  updateZoomPct();

  // Insert an image as a new page: pick any raster/SVG image, rasterize to PNG (pdf-lib embeds
  // PNG/JPEG only), append it as a page, then rebuild + re-render. All in-browser, no upload.
  const imgInput = host.querySelector('.pdf-imginput');
  host.querySelector('.pdf-addblank').addEventListener('click', async () => {
    if (!editor) return;
    await applyEdit(() => editor.addBlank());
  });
  host.querySelector('.pdf-addimg').addEventListener('click', () => { imgInput.value = ''; imgInput.click(); });
  imgInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !editor) return;
    try {
      const png = await imageFileToPngBytes(file);
      await applyEdit(() => editor.addImage(png));
    } catch (err) { infoEl.textContent = 'Could not add image: ' + esc(err.message); }
  });

  // Merge: append another PDF's pages to the end.
  const pdfInput = host.querySelector('.pdf-pdfinput');
  host.querySelector('.pdf-merge').addEventListener('click', () => { pdfInput.value = ''; pdfInput.click(); });
  pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !editor) return;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await applyEdit(async () => { await editor.addPdf(bytes); });
    } catch (err) { infoEl.textContent = 'Could not merge PDF: ' + esc(err.message); }
  });

  // Watermark: show/hide inline form; apply/clear watermark on the editor.
  host.querySelector('.pdf-watermark').addEventListener('click', () => {
    const form = host.querySelector('.pdf-watermark-form');
    form.hidden = !form.hidden;
    host.querySelector('.pdf-extract-form').hidden = true;
    host.querySelector('.pdf-split-form').hidden = true;
  });
  host.querySelector('.pdf-wm-apply').addEventListener('click', async () => {
    if (!editor) return;
    const text = host.querySelector('.pdf-wm-text').value.trim() || 'DRAFT';
    const opacity = parseFloat(host.querySelector('.pdf-wm-opacity').value) || 0.3;
    await applyEdit(() => { editor.watermark(text, { opacity }); });
    host.querySelector('.pdf-watermark-form').hidden = true;
  });
  host.querySelector('.pdf-wm-clear').addEventListener('click', async () => {
    if (!editor) return;
    await applyEdit(() => { editor.clearWatermark(); });
    host.querySelector('.pdf-watermark-form').hidden = true;
  });

  // Extract pages: show/hide inline form; call extractRange and trigger download.
  host.querySelector('.pdf-extract').addEventListener('click', () => {
    const form = host.querySelector('.pdf-extract-form');
    form.hidden = !form.hidden;
    host.querySelector('.pdf-watermark-form').hidden = true;
    host.querySelector('.pdf-split-form').hidden = true;
    if (!form.hidden && editor) {
      const total = editor.pageCount();
      host.querySelector('.pdf-ex-to').value = total;
      host.querySelector('.pdf-ex-from').max = total;
      host.querySelector('.pdf-ex-to').max = total;
    }
  });
  host.querySelector('.pdf-ex-apply').addEventListener('click', async () => {
    if (!editor) return;
    const fromVal = parseInt(host.querySelector('.pdf-ex-from').value, 10) || 1;
    const toVal = parseInt(host.querySelector('.pdf-ex-to').value, 10) || 1;
    const from0 = Math.max(0, fromVal - 1);
    const to0 = Math.max(0, toVal - 1);
    try {
      const bytes = await editor.extractRange(from0, to0);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (intake.filename || 'document').replace(/\.pdf$/i, '') + '-pages-' + fromVal + '-' + toVal + '.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) { infoEl.textContent = 'Could not extract pages: ' + esc(err.message); }
    host.querySelector('.pdf-extract-form').hidden = true;
  });
  host.querySelector('.pdf-ex-cancel').addEventListener('click', () => {
    host.querySelector('.pdf-extract-form').hidden = true;
  });

  // Split PDF: show inline form pre-filled with a suggested split, then split & download.
  host.querySelector('.pdf-split').addEventListener('click', () => {
    const form = host.querySelector('.pdf-split-form');
    form.hidden = !form.hidden;
    host.querySelector('.pdf-watermark-form').hidden = true;
    host.querySelector('.pdf-extract-form').hidden = true;
    if (!form.hidden && editor) {
      const total = editor.pageCount();
      const textarea = host.querySelector('.pdf-split-ranges');
      // Suggest split: one page per line if ≤10 pages, else split at midpoint
      if (total <= 10) {
        textarea.value = Array.from({ length: total }, (_, i) => (i + 1) + '-' + (i + 1)).join('\n');
      } else {
        const mid = Math.floor(total / 2);
        textarea.value = '1-' + mid + '\n' + (mid + 1) + '-' + total;
      }
    }
  });

  host.querySelector('.pdf-split-cancel').addEventListener('click', () => {
    host.querySelector('.pdf-split-form').hidden = true;
  });

  host.querySelector('.pdf-split-apply').addEventListener('click', async () => {
    if (!editor) return;
    const textarea = host.querySelector('.pdf-split-ranges');
    const lines = textarea.value.split('\n').map((l) => l.trim()).filter(Boolean);
    const ranges = [];
    for (const line of lines) {
      const m = line.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (!m) { infoEl.textContent = 'Invalid range: ' + esc(line) + ' — use format like 1-3'; return; }
      const from1 = parseInt(m[1], 10), to1 = parseInt(m[2], 10);
      if (from1 < 1 || to1 < from1) { infoEl.textContent = 'Invalid range: ' + esc(line); return; }
      ranges.push({ from: from1 - 1, to: to1 - 1 });
    }
    if (!ranges.length) { infoEl.textContent = 'No ranges specified.'; return; }
    let parts;
    try {
      parts = await editor.split(ranges);
    } catch (err) { infoEl.textContent = 'Split failed: ' + esc(err.message); return; }
    const baseName = (intake.filename || 'document').replace(/\.pdf$/i, '');
    if (parts.length === 1) {
      // Single range — direct download
      const blob = new Blob([parts[0]], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = baseName + '-part-1.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else {
      // Multiple ranges — try JSZip, fall back to sequential downloads
      let didZip = false;
      try {
        const JSZip = await loadGlobal(vendor('jszip/jszip.min.js'), 'JSZip');
        const zip = new JSZip();
        parts.forEach((bytes, i) => { zip.file('part-' + (i + 1) + '.pdf', bytes); });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = baseName + '-split.zip';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        didZip = true;
      } catch { /* fall through to sequential */ }
      if (!didZip) {
        for (let i = 0; i < parts.length; i++) {
          const blob = new Blob([parts[i]], { type: 'application/pdf' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = baseName + '-part-' + (i + 1) + '.pdf';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000 * (i + 1));
        }
      }
    }
    host.querySelector('.pdf-split-form').hidden = true;
  });

  host.querySelector('.pdf-download').addEventListener('click', () => {
    const blob = new Blob([currentBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (intake.filename || 'document').replace(/\.pdf$/i, '') + '-edited.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // Mount the host before waiting for pdf.js. This is essential for encrypted documents: their
  // password prompt lives inside the host and must be visible while initial rendering is paused.
  // The request signal resolves an abandoned prompt and prevents a detached renderer leaking.
  void renderPages(currentBytes).catch((error) => {
    if (ctx?.signal?.aborted) return;
    infoEl.textContent = 'Could not render PDF';
    pagesEl.replaceChildren();
    const failure = document.createElement('div');
    failure.className = 'json-error pdf-failure';
    const title = document.createElement('strong');
    title.textContent = 'Malformed or unsupported PDF';
    const list = document.createElement('ul');
    for (const message of pdfFailureDiagnostics(intake, error)) {
      const item = document.createElement('li');
      item.textContent = message;
      list.appendChild(item);
    }
    failure.append(title, list);
    pagesEl.appendChild(failure);
  });
  return { parentNode: host };
}
