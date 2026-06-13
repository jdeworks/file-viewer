// RawView controller (WP13/WP14): owns the raw side of the workspace and its 4-way mode
// switch — original / current / diff / move-diff — over a SHARED pair of Monaco models so
// edits stay consistent across modes. Keeping `original` immutable + `current` editable is
// the data-model foundation the diff (and move-aware diff, WP15/16) builds on.
import { loadMonaco } from './monaco-loader.js';

export const RAW_MODES = ['current', 'original', 'diff', 'movediff'];

function fill(el) { el.style.position = 'absolute'; el.style.inset = '0'; return el; }

export async function createRawView(host, {
  originalText, currentText, language, theme, options = {},
  onChange, onCursor, onScroll,
}) {
  const monaco = await loadMonaco();
  host.innerHTML = '';
  const stdHost = fill(document.createElement('div'));
  const diffHost = fill(document.createElement('div'));
  diffHost.style.display = 'none';
  host.append(stdHost, diffHost);

  const originalModel = monaco.editor.createModel(originalText, language);
  const modifiedModel = monaco.editor.createModel(currentText, language);

  const std = monaco.editor.create(stdHost, {
    model: modifiedModel, automaticLayout: true,
    theme: theme === 'dark' ? 'vs-dark' : 'vs', ...options,
  });
  let diff = null;
  let mode = 'current';
  let decorations = [];

  modifiedModel.onDidChangeContent(() => onChange?.(modifiedModel.getValue()));
  std.onDidChangeCursorPosition((e) => { if (mode !== 'diff' && mode !== 'movediff') onCursor?.(e.position.lineNumber); });
  std.onDidScrollChange(() => { if (mode !== 'diff' && mode !== 'movediff') onScroll?.(); });

  const isNarrow = () => window.matchMedia('(max-width: 760px)').matches;

  function ensureDiff() {
    if (diff) return diff;
    diff = monaco.editor.createDiffEditor(diffHost, {
      automaticLayout: true, theme: theme === 'dark' ? 'vs-dark' : 'vs',
      readOnly: false, originalEditable: false,
      renderSideBySide: !isNarrow(),     // inline on mobile, side-by-side on desktop
      ignoreTrimWhitespace: false, ...options,
    });
    diff.setModel({ original: originalModel, modified: modifiedModel });
    return diff;
  }

  function setMode(next) {
    mode = next;
    const showDiff = next === 'diff' || next === 'movediff';
    if (showDiff) {
      ensureDiff().updateOptions({ renderSideBySide: !isNarrow() });
      stdHost.style.display = 'none'; diffHost.style.display = '';
      diff.layout();
    } else {
      std.setModel(next === 'original' ? originalModel : modifiedModel);
      std.updateOptions({ readOnly: next === 'original' });
      diffHost.style.display = 'none'; stdHost.style.display = '';
      std.layout();
    }
  }

  return {
    monaco, mode: () => mode,
    setMode,
    getValue: () => modifiedModel.getValue(),
    setValue: (text) => modifiedModel.setValue(text),
    isDirty: () => originalModel.getValue() !== modifiedModel.getValue(),
    setLanguage(lang) { monaco.editor.setModelLanguage(originalModel, lang); monaco.editor.setModelLanguage(modifiedModel, lang); },
    setTheme(t) { monaco.editor.setTheme(t === 'dark' ? 'vs-dark' : 'vs'); },
    updateOptions(opts) { std.updateOptions(opts); diff?.updateOptions(opts); },
    layout() { std.layout(); diff?.layout(); if (mode === 'diff' || mode === 'movediff') diff?.updateOptions({ renderSideBySide: !isNarrow() }); },
    // Magic selector: highlight + reveal a 1-based inclusive line range on the std editor.
    decorate(startLine, endLine) {
      decorations = std.deltaDecorations(decorations, [{
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: { isWholeLine: true, className: 'fv-line-hl' },
      }]);
    },
    reveal(line) { std.revealLineInCenter(line); },
    // Scroll sync uses the std editor (active in current/original modes).
    scrollInfo() { return { top: std.getScrollTop(), max: std.getScrollHeight() - std.getLayoutInfo().height }; },
    setScrollTop(t) { std.setScrollTop(t); },
    canSync: () => mode === 'current' || mode === 'original',
    dispose() { std.dispose(); diff?.dispose(); originalModel.dispose(); modifiedModel.dispose(); host.innerHTML = ''; },
  };
}
