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
import { DOCX_MIME, docxContentIsDirty, originalDocxDownload, rebuiltDocxFilename } from './fidelity.js';

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

export async function mountDocxEditor(intake, host, ctx = {}) {
  let editor = null;
  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    try { editor?.destroy(); } catch { /* partially initialized/stale editor */ }
    editor = null;
  }
  // Register before conversion: a superseding preview owns both the initial Mammoth work and any
  // later lazy TipTap import. The renderer also returns this same function; request cleanup
  // identity-deduplicates it.
  ctx?.onCleanup?.(destroy);
  const { mammoth, DOMPurify } = await libs();
  if (destroyed || ctx?.signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
  const result = await mammoth.convertToHtml({ arrayBuffer: intake.bytes.slice().buffer });
  if (destroyed || ctx?.signal?.aborted) throw new DOMException('Preview superseded', 'AbortError');
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
  const original = originalDocxDownload(intake);

  host.className = 'dx-doc';
  host.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'dx-bar';
  const info = document.createElement('span');
  info.className = 'dx-info';
  info.textContent = 'Read-only · unchanged';
  const editBtn = document.createElement('button');
  editBtn.className = 'dx-edit';
  editBtn.textContent = 'Edit';
  const originalDownload = document.createElement('button');
  originalDownload.className = 'dx-download-original';
  originalDownload.textContent = 'Download original';
  originalDownload.title = 'Download the exact original bytes without conversion';
  const rebuiltDownload = document.createElement('button');
  rebuiltDownload.className = 'dx-download dx-download-rebuilt';
  rebuiltDownload.textContent = 'Download rebuilt .docx';
  rebuiltDownload.title = 'Build a simplified Word document from changed semantic HTML';
  rebuiltDownload.disabled = true;
  bar.append(info, editBtn, originalDownload, rebuiltDownload);
  host.appendChild(bar);

  const note = document.createElement('div');
  note.className = 'dx-note';
  note.textContent = 'This reading view is converted to semantic HTML. Page layout, fonts, headers/footers, footnotes, comments, and complex numbering may be omitted. “Download original” is exact; the rebuilt copy preserves edited text and basic structure only.';
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

  let editing = false;
  let entering = null;
  let baselineHtml = null;
  let dirty = false;
  let building = false;
  let userChanged = false;

  const isLive = () => !destroyed && !ctx?.signal?.aborted && host.isConnected;
  function refreshState() {
    dirty = userChanged && editor && baselineHtml != null
      ? docxContentIsDirty(baselineHtml, editor.getHTML())
      : false;
    rebuiltDownload.disabled = !dirty || building;
    info.classList.toggle('dx-modified', dirty);
    if (editing) info.textContent = dirty ? 'Editing · changed' : 'Editing · unchanged';
    else info.textContent = dirty ? 'Edited · rebuilt copy available' : 'Read-only · unchanged';
  }

  async function testCheckpoint(stage) {
    const hook = globalThis.__fvDocxEditorTestHook;
    if (typeof hook === 'function') await hook({ stage, filename: intake.filename, signal: ctx?.signal });
  }

  editHost.addEventListener('beforeinput', () => {
    // TipTap plugins can finish normalizing imported HTML after onCreate. Capture the definitive
    // baseline at the last possible moment before the first user mutation, never after it.
    if (!userChanged && editor) baselineHtml = editor.getHTML();
    userChanged = true;
  });
  editHost.addEventListener('input', () => {
    userChanged = true; // fallback for browser/input methods that omit beforeinput
    refreshState();
  });
  editHost.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      // History commands update the ProseMirror document inside this key event; mark it as a user
      // operation before TipTap's onUpdate callback compares against the normalized baseline.
      userChanged = true;
    }
  });

  async function enterEdit() {
    if (entering) return entering;
    entering = (async () => {
      editBtn.disabled = true;
      editBtn.textContent = 'Loading editor…';
      injectTiptapCss();
      if (!editor) {
        await testCheckpoint('before-tiptap-load');
        const { Editor, StarterKit, TableKit } = await loadTiptap();
        await testCheckpoint('before-tiptap-mount');
        if (!isLive()) {
          await testCheckpoint('tiptap-mount-skipped');
          return;
        }
        let resolveCreated;
        const created = new Promise((resolve) => { resolveCreated = resolve; });
        const nextEditor = new Editor({
          element: editHost,
          extensions: [StarterKit, TableKit.configure({ table: { resizable: true } })],
          content: article.innerHTML,
          onUpdate: () => { if (isLive() && userChanged) refreshState(); },
          onCreate: ({ editor: createdEditor }) => {
            baselineHtml = createdEditor.getHTML();
            userChanged = false;
            dirty = false;
            resolveCreated();
          },
        });
        editor = nextEditor;
        await created;
        if (!isLive()) { nextEditor.destroy(); editor = null; return; }
      }
      if (!isLive()) return;
      editing = true;
      article.hidden = true;
      editHost.hidden = false;
      editBtn.classList.add('active');
      editBtn.textContent = 'Done';
      refreshState();
      editor.commands.focus();
    })().catch((error) => {
      if (isLive()) info.textContent = 'Editor failed: ' + error.message;
    }).finally(() => {
      entering = null;
      if (!isLive()) return;
      editBtn.disabled = false;
      editBtn.textContent = editing ? 'Done' : 'Edit';
    });
    return entering;
  }

  function exitEdit() {
    editing = false;
    // Carry edits back into the read-only view so they show + export consistently.
    if (editor) article.innerHTML = editor.getHTML();
    editHost.hidden = true;
    article.hidden = false;
    editBtn.classList.remove('active');
    editBtn.textContent = 'Edit';
    refreshState();
  }

  editBtn.addEventListener('click', () => { if (editing) exitEdit(); else void enterEdit(); });

  originalDownload.addEventListener('click', () => {
    downloadBlob(original.bytes, original.filename, original.mime);
  });

  rebuiltDownload.addEventListener('click', async () => {
    refreshState();
    if (!dirty || building) return;
    const htmlForExport = editor?.getHTML() || article.innerHTML;
    building = true;
    refreshState();
    rebuiltDownload.textContent = 'Building…';
    try {
      const { buildDocx } = await import('../../../core/docx-export.js');
      const blob = await buildDocx(htmlForExport);
      if (!isLive()) return;
      downloadBlob(blob, rebuiltDocxFilename(intake.filename), DOCX_MIME);
    } catch (err) {
      if (isLive()) info.textContent = 'Export failed: ' + err.message;
    } finally {
      building = false;
      if (isLive()) {
        rebuiltDownload.textContent = 'Download rebuilt .docx';
        refreshState();
      }
    }
  });

  refreshState();
  return { host, hadUnsafe, destroy };
}
