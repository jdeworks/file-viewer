// PDF viewer + lite editor. Pages are rendered to images with pdf.js (which PARSES, never
// executes, the PDF) directly in the parent pane, so we can attach edit controls. Default is a
// clean read-only view; an Edit toggle reveals per-page rotate / move / delete, and edits (via
// pdf-lib, lazy-loaded) produce a new PDF you can download. The original bytes are never mutated.
import { loadPdfjs } from './pdflib.js';
import { createEditor } from './pdfedit.js';

const MAX_PAGES = 50;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function render(intake, ctx) {
  const scale = ctx?.settings?.pdfScale || 1.5;
  const host = document.createElement('div');
  host.className = 'pdf-doc';
  host.innerHTML =
    '<div class="pdf-bar"><span class="pdf-info"></span>'
    + '<button class="pdf-edit" title="Edit pages">Edit</button>'
    + '<button class="pdf-download" hidden>Download edited PDF</button></div>'
    + '<div class="pdf-pages"></div>';
  const pagesEl = host.querySelector('.pdf-pages');
  const infoEl = host.querySelector('.pdf-info');

  let editor = null, editing = false, dirty = false, currentBytes = intake.bytes;

  async function renderPages(bytes) {
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ data: bytes.slice() }).promise;
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
      wrap.appendChild(img);
      if (editing) wrap.appendChild(pageControls(i - 1));
      pagesEl.appendChild(wrap);
    }
    if (doc.numPages > max) { const n = document.createElement('p'); n.className = 'pdf-note'; n.textContent = 'Showing first ' + max + ' of ' + doc.numPages + ' pages.'; pagesEl.appendChild(n); }
    infoEl.textContent = doc.numPages + ' page' + (doc.numPages === 1 ? '' : 's') + (editing ? ' · editing' : '') + (dirty ? ' · modified' : '');
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

  async function applyEdit(mutate) {
    mutate();
    dirty = true;
    host.querySelector('.pdf-download').hidden = false;
    currentBytes = await editor.build();
    await renderPages(currentBytes);
  }

  host.querySelector('.pdf-edit').addEventListener('click', async () => {
    editing = !editing;
    host.querySelector('.pdf-edit').classList.toggle('active', editing);
    if (editing && !editor) {
      try { editor = await createEditor(intake.bytes); }
      catch (e) { infoEl.textContent = 'Editing unavailable: ' + esc(e.message); editing = false; host.querySelector('.pdf-edit').classList.remove('active'); return; }
    }
    await renderPages(currentBytes);
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
