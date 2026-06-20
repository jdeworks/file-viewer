import { loadGlobal, vendor } from '../../core/script-loader.js';

let easyMDE = null;
let _textarea = null;

export async function mountWysiwyg(container, text, onChange) {
  // Destroy any previous instance
  unmountWysiwyg();
  // EasyMDE needs a textarea
  _textarea = document.createElement('textarea');
  _textarea.value = text;
  container.innerHTML = '';
  container.appendChild(_textarea);
  // Inject EasyMDE CSS before mounting (avoids flash of unstyled content)
  if (!document.getElementById('easymde-css')) {
    const link = document.createElement('link');
    link.id = 'easymde-css';
    link.rel = 'stylesheet';
    link.href = vendor('easymde/easymde.min.css');
    document.head.appendChild(link);
  }
  const EasyMDE = await loadGlobal(vendor('easymde/easymde.min.js'), 'EasyMDE');
  easyMDE = new EasyMDE({
    element: _textarea,
    initialValue: text,
    autofocus: true,
    spellChecker: false,
    toolbar: false,           // we use our own toolbar
    status: false,
    minHeight: '300px',
    renderingConfig: { singleLineBreaks: false },
  });
  easyMDE.codemirror.on('change', () => {
    onChange?.(easyMDE.value());
  });
  // Enter side-by-side preview so the user immediately sees rendered Markdown.
  easyMDE.toggleSideBySide();
  return easyMDE;
}

export function unmountWysiwyg() {
  if (easyMDE) {
    try { easyMDE.toTextArea(); } catch {}
    easyMDE = null;
  }
  _textarea = null;
}

export function getWysiwygValue() {
  return easyMDE?.value() ?? '';
}

export function isWysiwygActive() {
  return easyMDE !== null;
}

/**
 * Apply a markdown action (bold, italic, etc.) via EasyMDE's CodeMirror instance.
 * Wraps the current selection with the given prefix/suffix markers.
 */
export function wysiwygWrap(before, after, placeholder) {
  if (!easyMDE) return;
  const cm = easyMDE.codemirror;
  const selected = cm.getSelection();
  const text = selected || placeholder || '';
  cm.replaceSelection(before + text + (after ?? before));
}

/** Expose the underlying CodeMirror instance for fine-grained action integration. */
export function getWysiwygCodeMirror() {
  return easyMDE?.codemirror ?? null;
}
