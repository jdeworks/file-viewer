// RawView controller (WP13/WP14): owns the raw side of the workspace and its 4-way mode
// switch — original / current / diff / move-diff — over a SHARED pair of Monaco models so
// edits stay consistent across modes. Keeping `original` immutable + `current` editable is
// the data-model foundation the diff (and move-aware diff, WP15/16) builds on.
import { loadMonaco } from './monaco-loader.js';

export const RAW_MODES = ['current', 'original', 'diff', 'movediff'];

function fill(el) { el.style.position = 'absolute'; el.style.inset = '0'; return el; }

export async function createRawView(host, {
  originalText, currentText, language, theme, options = {},
  onChange, onCursor, onScroll, onMoveDiff, onCustomDiff,
}) {
  const monaco = await loadMonaco();
  host.innerHTML = '';
  const stdHost = fill(document.createElement('div'));
  const diffHost = fill(document.createElement('div'));
  const moveHost = fill(document.createElement('div'));
  const customHost = fill(document.createElement('div'));    // type-provided diff (e.g. JSON key diff)
  moveHost.className = 'movediff-host';
  customHost.className = 'movediff-host';
  diffHost.style.display = 'none';
  moveHost.style.display = 'none';
  customHost.style.display = 'none';
  host.append(stdHost, diffHost, moveHost, customHost);

  const originalModel = monaco.editor.createModel(originalText, language);
  const modifiedModel = monaco.editor.createModel(currentText, language);
  // Optional "Compare with another file": when set, the diff/custom-diff use THIS as the original
  // side instead of the as-loaded original — so diff means current-file ↔ picked-file, leaving the
  // edit-tracking (original ↔ modified) untouched.
  let compareModel = null;
  const diffOriginal = () => compareModel || originalModel;

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
    diff.setModel({ original: diffOriginal(), modified: modifiedModel });
    return diff;
  }

  function setMode(next) {
    mode = next;
    stdHost.style.display = 'none'; diffHost.style.display = 'none'; moveHost.style.display = 'none'; customHost.style.display = 'none';
    // A type can supply a custom diff (e.g. JSON key-tree) — it replaces Monaco's text diff.
    if (next === 'diff' && onCustomDiff) {
      customHost.style.display = '';
      onCustomDiff(customHost, diffOriginal().getValue(), modifiedModel.getValue());
    } else if (next === 'diff') {
      ensureDiff().setModel({ original: diffOriginal(), modified: modifiedModel });
      diff.updateOptions({ renderSideBySide: !isNarrow() });
      diffHost.style.display = ''; diff.layout();
    } else if (next === 'movediff') {
      moveHost.style.display = '';
      onMoveDiff?.(moveHost, diffOriginal().getValue(), modifiedModel.getValue());
    } else {
      std.setModel(next === 'original' ? originalModel : modifiedModel);
      std.updateOptions({ readOnly: next === 'original' });
      stdHost.style.display = ''; std.layout();
    }
  }

  return {
    monaco, mode: () => mode,
    setMode,
    getValue: () => modifiedModel.getValue(),
    originalValue: () => originalModel.getValue(),
    setValue: (text) => modifiedModel.setValue(text),
    isDirty: () => originalModel.getValue() !== modifiedModel.getValue(),
    setLanguage(lang) { monaco.editor.setModelLanguage(originalModel, lang); monaco.editor.setModelLanguage(modifiedModel, lang); if (compareModel) monaco.editor.setModelLanguage(compareModel, lang); },
    // Compare the current file against another file's text (current ↔ other). Switches to diff.
    setCompare(text, lang) {
      if (!compareModel) compareModel = monaco.editor.createModel(text, lang || language);
      else compareModel.setValue(text);
      if (lang) monaco.editor.setModelLanguage(compareModel, lang);
      setMode('diff');
    },
    clearCompare() {
      if (!compareModel) return;
      const m = compareModel; compareModel = null;
      if (mode === 'diff') setMode('diff');     // re-render against the as-loaded original
      m.dispose();
    },
    hasCompare: () => !!compareModel,
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
    format() { return std.getAction?.('editor.action.formatDocument')?.run(); },
    // Scroll sync uses the std editor (active in current/original modes).
    scrollInfo() { return { top: std.getScrollTop(), max: std.getScrollHeight() - std.getLayoutInfo().height }; },
    setScrollTop(t) { std.setScrollTop(t); },
    canSync: () => mode === 'current' || mode === 'original',
    dispose() { std.dispose(); diff?.dispose(); originalModel.dispose(); modifiedModel.dispose(); compareModel?.dispose(); host.innerHTML = ''; },
  };
}
