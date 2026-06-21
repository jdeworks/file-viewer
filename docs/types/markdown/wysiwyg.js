// Markdown WYSIWYG editor — TipTap v3 (ProseMirror) over a faithful markdown
// round-trip (parse markdown → editable rich doc → serialize back to CommonMark).
// Replaces the old EasyMDE/CodeMirror integration. The bundle is vendored
// (build-time, zero runtime CDN) at docs/vendor/tiptap/tiptap.esm.js — rebuild
// with: cd build/tiptap && npm install && node build.mjs
//
// Public contract consumed by core/rawpane.js + core/rawpane-markdown.js:
//   mountWysiwyg(container, text, onChange) -> Promise<Editor>
//   unmountWysiwyg()
//   getWysiwygValue() -> string        (markdown)
//   isWysiwygActive() -> boolean
//   wysiwygWrap(before, after, placeholder)   (legacy toolbar helper)
//   runWysiwygCommand(action)          (TipTap-native toolbar actions)
//   insertWysiwygMarkdown(md)          (insert raw markdown, e.g. a table)
//   focusWysiwyg()
import { vendor } from '../../core/script-loader.js';

let editor = null;
let _tiptap = null;

async function loadTiptap() {
  if (!_tiptap) _tiptap = await import(vendor('tiptap/tiptap.esm.js'));
  return _tiptap;
}

function injectCssOnce() {
  if (document.getElementById('tiptap-css')) return;
  const link = document.createElement('link');
  link.id = 'tiptap-css';
  link.rel = 'stylesheet';
  link.href = vendor('tiptap/tiptap.css');
  document.head.appendChild(link);
}

export async function mountWysiwyg(container, text, onChange) {
  unmountWysiwyg();
  injectCssOnce();
  const { Editor, StarterKit, TableKit, TaskList, TaskItem, Markdown } = await loadTiptap();
  container.innerHTML = '';
  const host = document.createElement('div');
  host.className = 'tiptap-host';
  container.appendChild(host);

  editor = new Editor({
    element: host,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TableKit.configure({ table: { resizable: true } }),
      // GFM task lists: TaskList container + checkable TaskItem (nested allowed).
      // The Markdown extension recognizes the taskList/taskItem nodes and
      // round-trips them as `- [ ]` / `- [x]`.
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
    ],
    autofocus: true,
    onUpdate: () => onChange?.(getWysiwygValue()),
  });
  // Feed the source markdown through the markdown parser (parse → PM doc).
  editor.commands.setContent(text ?? '', { contentType: 'markdown' });
  return editor;
}

export function unmountWysiwyg() {
  if (editor) {
    try { editor.destroy(); } catch {}
    editor = null;
  }
}

export function getWysiwygValue() {
  if (!editor) return '';
  try { return editor.getMarkdown(); } catch { return ''; }
}

export function isWysiwygActive() {
  return editor !== null;
}

export function focusWysiwyg() {
  editor?.commands.focus();
}

/**
 * Legacy wrap helper kept for API compatibility. With TipTap we toggle the
 * corresponding mark rather than inserting literal markers, falling back to a
 * literal insert for anything unmapped.
 */
export function wysiwygWrap(before, after, placeholder) {
  if (!editor) return;
  const map = { '**': 'bold', '*': 'italic', '~~': 'strike', '`': 'code' };
  const action = map[before];
  if (action) { runWysiwygCommand(action); return; }
  const sel = editor.state.selection;
  const text = editor.state.doc.textBetween(sel.from, sel.to) || placeholder || '';
  editor.chain().focus().insertContent(before + text + (after ?? before)).run();
}

/**
 * Run a markdown toolbar action as a native TipTap command. `action` matches the
 * data-action strings dispatched by core/rawpane-markdown.js. Returns true if
 * the action was handled here (table is handled by the caller's picker).
 */
export function runWysiwygCommand(action, opts = {}) {
  if (!editor) return false;
  const c = editor.chain().focus();
  switch (action) {
    case 'bold': c.toggleBold().run(); return true;
    case 'italic': c.toggleItalic().run(); return true;
    case 'strikethrough': c.toggleStrike().run(); return true;
    case 'inline-code': c.toggleCode().run(); return true;
    case 'code-block': c.toggleCodeBlock().run(); return true;
    case 'blockquote': c.toggleBlockquote().run(); return true;
    case 'bullet-list': c.toggleBulletList().run(); return true;
    case 'ordered-list': c.toggleOrderedList().run(); return true;
    case 'task-list': c.toggleTaskList().run(); return true;
    case 'heading': c.toggleHeading({ level: Math.min(6, Math.max(1, opts.level || 1)) }).run(); return true;
    case 'paragraph': c.setParagraph().run(); return true;
    default: return false;
  }
}

/** Insert a markdown fragment (e.g. a generated table) at the cursor. */
export function insertWysiwygMarkdown(md) {
  if (!editor) return;
  editor.chain().focus().insertContent(md, { contentType: 'markdown' }).run();
}
