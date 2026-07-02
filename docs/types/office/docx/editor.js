// DOCX rich-text editor (parent pane, parentNode mode). The document is converted to clean,
// sanitized HTML by mammoth (read-only view), and an "Edit" toggle mounts a TipTap (ProseMirror)
// surface over that HTML so the user can edit headings / bold / italic / lists / tables. On
// "Download .docx" the edited HTML is serialized to a real Word file by core/docx-export.js
// (the same minimal-OOXML writer used by the generic "Download as Word"), then offered as a blob.
//
// FIDELITY: this is an HTML-faithful round-trip, NOT a byte-level DOCX round-trip. mammoth maps
// the document to semantic HTML (it drops page geometry, fonts, footnotes, comments, complex
// numbering, etc.), and the exporter re-emits headings/bold/italic/lists/tables as fresh OOXML.
// Text and basic structure survive; advanced Word features do not. A note in the UI says so.
import { loadGlobal, vendor } from '../../../core/script-loader.js';
import { downloadBlob } from '../../../core/exports.js';

let _tiptap = null;
async function loadTiptap() {
  if (!_tiptap) _tiptap = await import(vendor('tiptap/tiptap.esm.js'));
  return _tiptap;
}
function injectTiptapCss() {
  if (document.getElementById('tiptap-css')) return;
  const link = document.createElement('link');
  link.id = 'tiptap-css';
  link.rel = 'stylesheet';
  link.href = vendor('tiptap/tiptap.css');
  document.head.appendChild(link);
}

async function libs() {
  const [mammoth, DOMPurify] = await Promise.all([
    loadGlobal(vendor('mammoth/mammoth.browser.min.js'), 'mammoth'),
    loadGlobal(vendor('dompurify/purify.min.js'), 'DOMPurify'),
  ]);
  return { mammoth, DOMPurify };
}

export async function mountDocxEditor(intake, host) {
  const { mammoth, DOMPurify } = await libs();
  const result = await mammoth.convertToHtml({ arrayBuffer: intake.bytes.slice().buffer });
  DOMPurify.removed = [];
  // mammoth normally embeds images as data: URIs, but a *linked* (not embedded, TargetMode=
  // "External") image relationship in the .docx is passed through as a plain <img src="http(s)://…">
  // — a live off-origin fetch (tracking pixel) the instant the document is opened, since this
  // renders directly in the parent pane (no sandboxed iframe here, unlike eml/epub). FORBID_TAGS/
  // FORBID_ATTR must cover every DOMPurify-default-allowed vector that can trigger a fetch we don't
  // control: <style>/style="" (CSS url()), background=/poster=, <link>/<meta>/<base> (a <base href>
  // would turn even a relative <img src> off-origin), and <iframe>/<video>/<audio>/<source>/<track>/
  // <object>/<embed>/<form>. Any remaining absolute http(s) <img src> (linked image) is blanked
  // afterward, mirroring the eml/epub renderers.
  const clean = DOMPurify.sanitize(result.value, {
    FORBID_TAGS: ['script', 'style', 'link', 'iframe', 'object', 'embed', 'video', 'audio', 'source', 'track', 'form', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'style', 'background', 'poster', 'onerror', 'onload', 'onclick'],
  }).replace(
    /(<img[^>]*\s)src\s*=\s*(?:"https?:[^"]*"|'https?:[^']*'|https?:\S+)/gi,
    '$1src=""',
  );
  const hadUnsafe = DOMPurify.removed.length > 0;
  const base = (intake.filename || 'document').replace(/\.[^.]+$/, '');

  host.className = 'dx-doc';
  host.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'dx-bar';
  const info = document.createElement('span');
  info.className = 'dx-info';
  info.textContent = 'Read-only';
  const editBtn = document.createElement('button');
  editBtn.className = 'dx-edit';
  editBtn.textContent = 'Edit';
  const dl = document.createElement('button');
  dl.className = 'dx-download';
  dl.textContent = 'Download .docx';
  bar.append(info, editBtn, dl);
  host.appendChild(bar);

  const note = document.createElement('div');
  note.className = 'dx-note';
  note.hidden = true;
  note.innerHTML = 'Editing an HTML view of the document. Export re-creates a Word file with text, '
    + 'headings, bold/italic, lists and tables — page layout, fonts, footnotes and comments are not preserved.';
  host.appendChild(note);

  // Read-only article (the existing faithful preview). Hidden while editing.
  const article = document.createElement('article');
  article.className = 'docx-body dx-view';
  article.innerHTML = clean;
  host.appendChild(article);

  // Edit surface — TipTap mounts here on first toggle.
  const editHost = document.createElement('div');
  editHost.className = 'dx-edit-host';
  editHost.hidden = true;
  host.appendChild(editHost);

  let editor = null;
  let editing = false;

  async function enterEdit() {
    injectTiptapCss();
    if (!editor) {
      const { Editor, StarterKit, TableKit } = await loadTiptap();
      editor = new Editor({
        element: editHost,
        extensions: [StarterKit, TableKit.configure({ table: { resizable: true } })],
        content: article.innerHTML,   // HTML in; TipTap parses it to a PM doc
      });
    }
    editing = true;
    article.hidden = true;
    editHost.hidden = false;
    note.hidden = false;
    editBtn.classList.add('active');
    editBtn.textContent = 'Done';
    info.textContent = 'Editing';
    editor.commands.focus();
  }

  function exitEdit() {
    editing = false;
    // Carry edits back into the read-only view so they show + export consistently.
    if (editor) article.innerHTML = editor.getHTML();
    editHost.hidden = true;
    article.hidden = false;
    editBtn.classList.remove('active');
    editBtn.textContent = 'Edit';
    info.textContent = 'Edited (unsaved)';
  }

  editBtn.addEventListener('click', () => { editing ? exitEdit() : enterEdit(); });

  dl.addEventListener('click', async () => {
    const htmlForExport = (editing && editor) ? editor.getHTML() : article.innerHTML;
    dl.disabled = true;
    const prev = dl.textContent;
    dl.textContent = 'Building…';
    try {
      const { buildDocx } = await import('../../../core/docx-export.js');
      const blob = await buildDocx(htmlForExport);
      downloadBlob(blob, base + '-edited.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (err) {
      info.textContent = 'Export failed: ' + err.message;
    } finally {
      dl.disabled = false; dl.textContent = prev;
    }
  });

  return { host, hadUnsafe, destroy() { try { editor?.destroy(); } catch {} } };
}
