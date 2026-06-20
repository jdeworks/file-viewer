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

const MAX_PAGES = 50;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const scale = ctx?.settings?.pdfScale || 1.5;
  const host = document.createElement('div');
  host.className = 'pdf-doc';
  host.innerHTML =
    '<div class="pdf-bar"><span class="pdf-info"></span>'
    + '<button class="pdf-spread" title="Two-page spread (book mode)">⊞ Spread</button>'
    + '<button class="pdf-edit" title="Edit pages">Edit</button>'
    + '<button class="pdf-addimg" hidden title="Add an image as a new page">+ Image page</button>'
    + '<button class="pdf-merge" hidden title="Append another PDF">+ Merge PDF</button>'
    + '<button class="pdf-watermark" hidden title="Add a text watermark to all pages">Watermark</button>'
    + '<button class="pdf-extract" hidden title="Extract a range of pages to a new PDF">Extract pages</button>'
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
        });
        host.removeChild(overlay);
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
      pagesEl.innerHTML = '';
      for (let i = 1; i <= max; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        const wrap = document.createElement('div');
        wrap.className = 'pdf-page-wrap';
        const img = document.createElement('img');
        img.className = 'pdf-page'; img.alt = 'Page ' + i; img.src = canvas.toDataURL('image/png');
        canvas.width = canvas.height = 0;
        page.cleanup();
        wrap.appendChild(img);
        if (editing) wrap.appendChild(pageControls(i - 1));
        pagesEl.appendChild(wrap);
      }
      if (doc.numPages > max) { const n = document.createElement('p'); n.className = 'pdf-note'; n.textContent = 'Showing first ' + max + ' of ' + doc.numPages + ' pages.'; pagesEl.appendChild(n); }
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
    updateChanges();
    await renderPages(currentBytes);
  }

  host.querySelector('.pdf-edit').addEventListener('click', async () => {
    editing = !editing;
    host.querySelector('.pdf-edit').classList.toggle('active', editing);
    host.querySelector('.pdf-addimg').hidden = !editing;
    host.querySelector('.pdf-merge').hidden = !editing;
    host.querySelector('.pdf-watermark').hidden = !editing;
    host.querySelector('.pdf-extract').hidden = !editing;
    if (!editing) {
      host.querySelector('.pdf-watermark-form').hidden = true;
      host.querySelector('.pdf-extract-form').hidden = true;
    }
    if (editing && !editor) {
      try { editor = await createEditor(intake.bytes); }
      catch (e) {
        infoEl.textContent = 'Editing unavailable: ' + esc(e.message);
        editing = false;
        host.querySelector('.pdf-edit').classList.remove('active');
        host.querySelector('.pdf-addimg').hidden = true;
        host.querySelector('.pdf-merge').hidden = true;
        host.querySelector('.pdf-watermark').hidden = true;
        host.querySelector('.pdf-extract').hidden = true;
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

  // Insert an image as a new page: pick any raster/SVG image, rasterize to PNG (pdf-lib embeds
  // PNG/JPEG only), append it as a page, then rebuild + re-render. All in-browser, no upload.
  const imgInput = host.querySelector('.pdf-imginput');
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

  host.querySelector('.pdf-download').addEventListener('click', () => {
    const blob = new Blob([currentBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (intake.filename || 'document').replace(/\.pdf$/i, '') + '-edited.pdf';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  await renderPages(currentBytes);
  return { parentNode: host };
}
