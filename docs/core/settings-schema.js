// Settings descriptor schema (WP03). A descriptor is the single source of truth for a
// control: its category drives WHERE it renders, its type drives HOW it renders, and
// applyMonacoOptions() maps values onto Monaco. Types contribute their own VIEWER
// descriptors via index.js `settings.schema`; everything here is common/core.
// Every descriptor carries a `hint` so the UI can explain what it does / where it applies.
//
// Categories (render order). Preview groups come first (reading-first); monaco-* apply to
// the raw editor, viewer-* to the preview, always = general app preferences.
export const CATEGORY_ORDER = ['viewer-common', 'viewer-extended', 'monaco-common', 'monaco-extended', 'always', 'advanced'];
export const CATEGORY_LABEL = {
  always: 'General',
  'monaco-common': 'Editor',
  'monaco-extended': 'Editor — advanced',
  'viewer-common': 'Preview',
  'viewer-extended': 'Preview — advanced',
  advanced: 'Advanced',
};
// Which categories collapse by default (extended = expert, start collapsed).
export const CATEGORY_OPEN = { always: true, 'monaco-common': true, 'monaco-extended': false, 'viewer-common': true, 'viewer-extended': false, advanced: false };

// Descriptor: { key, label, category, type:'bool'|'number'|'select', default, options?, min?, max?, hint? }

// General app preferences — shown for every type regardless of capabilities.
export const GENERAL_DESCRIPTORS = [
  { key: 'showAllTypes', label: 'Show all file types in selector', category: 'always', type: 'bool', default: false,
    hint: 'The type dropdown normally lists only formats that matched this file (≥1%). Turn on to always list every supported type so you can force any viewer.' },
  { key: 'treeArrowKeys', label: 'Arrow-key file navigation', category: 'always', type: 'bool', default: true,
    hint: 'When the folder sidebar has focus, ↑/↓ move between files and open them. Click a file first to focus the tree.' },
  { key: 'reduceMotion', label: 'Reduce motion', category: 'advanced', type: 'bool', default: false,
    hint: 'Disable UI and game animations (transitions, pulses, arcade effects). Helps on low-power devices or if motion is distracting.' },
  { key: 'enableFfmpeg', label: 'Media transcoding (ffmpeg.wasm — ~23 MB download on first use)', category: 'advanced', type: 'bool', default: false,
    hint: 'Convert audio/video formats your browser cannot play natively (AVI, WMV, FLV, TS, ...) using ffmpeg.wasm. Downloads ~23 MB the first time; cached for subsequent uses. Transcoding runs entirely in-browser — no upload, no server.' },
  { key: 'enableArchiveWasm', label: 'Archive support (libarchive.wasm — ~1 MB download on first use)', category: 'advanced', type: 'bool', default: false,
    hint: 'List and extract 7z, RAR, tar, tar.gz archives using libarchive.wasm. Downloads ~1 MB the first time; cached for subsequent uses. Runs entirely in-browser.' },
  { key: 'enableEmulators', label: 'Emulators (v86, EmulatorJS, Ruffle Flash — download per-engine on first use)', category: 'advanced', type: 'bool', default: false,
    hint: 'Run retro console ROMs, DOS software, and Flash games in-browser. Each emulator engine downloads on first use (1–4 MB each). Only open files from sources you trust — emulated software runs with reduced but non-zero access.' },
];

// Shown for any type with capability.rawView. Apply to the Monaco raw editor.
export const MONACO_DESCRIPTORS = [
  { key: 'wordWrap', label: 'Word wrap', category: 'monaco-common', type: 'select', options: ['on', 'off', 'bounded'], default: 'on',
    hint: 'Wrap long lines in the editor instead of scrolling sideways.' },
  { key: 'fontSize', label: 'Font size', category: 'monaco-common', type: 'number', min: 8, max: 40, default: 14,
    hint: 'Editor text size, in pixels.' },
  { key: 'lineNumbers', label: 'Line numbers', category: 'monaco-common', type: 'select', options: ['on', 'off', 'relative'], default: 'on',
    hint: 'Gutter line numbers. "relative" counts from the cursor (handy for Vim-style motions).' },
  { key: 'tabSize', label: 'Tab size', category: 'monaco-common', type: 'number', min: 1, max: 8, default: 2,
    hint: 'How many spaces one indentation level is shown as.' },
  { key: 'fontFamily', label: 'Font family', category: 'monaco-common', type: 'select', options: ['monospace', 'Menlo', 'Consolas', 'Courier New', 'Fira Code'], default: 'monospace',
    hint: 'Editor typeface. Falls back to the system monospace font if the chosen one is unavailable.' },

  { key: 'minimap', label: 'Minimap', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'The zoomed-out code overview on the right edge of the editor.' },
  { key: 'renderWhitespace', label: 'Show whitespace', category: 'monaco-extended', type: 'select', options: ['none', 'boundary', 'trailing', 'all'], default: 'none',
    hint: 'Render dots/arrows for spaces and tabs.' },
  { key: 'indentGuides', label: 'Indent guides', category: 'monaco-extended', type: 'bool', default: true,
    hint: 'Vertical lines marking each indentation level.' },
  { key: 'insertSpaces', label: 'Insert spaces (vs tabs)', category: 'monaco-extended', type: 'bool', default: true,
    hint: 'Pressing Tab inserts spaces instead of a tab character.' },
  { key: 'lineHeight', label: 'Line height (0 = auto)', category: 'monaco-extended', type: 'number', min: 0, max: 48, default: 0,
    hint: 'Pixel height of each editor line. 0 derives it from the font size.' },
  { key: 'cursorStyle', label: 'Cursor style', category: 'monaco-extended', type: 'select', options: ['line', 'block', 'underline', 'line-thin'], default: 'line',
    hint: 'Shape of the text caret.' },
  { key: 'cursorBlinking', label: 'Cursor blinking', category: 'monaco-extended', type: 'select', options: ['blink', 'smooth', 'phase', 'expand', 'solid'], default: 'blink',
    hint: 'Caret blink animation.' },
  { key: 'smoothScrolling', label: 'Smooth scrolling', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'Animate editor scrolling instead of jumping.' },
  { key: 'mouseWheelZoom', label: 'Ctrl+wheel zoom', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'Hold Ctrl and scroll to change the editor font size.' },
  { key: 'renderControlCharacters', label: 'Show control chars', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'Render invisible control characters (e.g. ␀) instead of hiding them.' },
  { key: 'fontLigatures', label: 'Font ligatures', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'Combine character pairs like => into a single glyph (needs a ligature font such as Fira Code).' },
  { key: 'bracketPairColorization', label: 'Bracket pair colors', category: 'monaco-extended', type: 'bool', default: true,
    hint: 'Tint matching brackets in the same color to make nesting readable.' },
  { key: 'stickyScroll', label: 'Sticky scroll', category: 'monaco-extended', type: 'bool', default: false,
    hint: 'Pin the enclosing scope (function/class headers) to the top while scrolling.' },
  { key: 'folding', label: 'Code folding', category: 'monaco-extended', type: 'bool', default: true,
    hint: 'Show gutter controls to collapse/expand code regions.' },
];

// Shown for any type with capability.preview (generic; types add more via settings.schema).
export const VIEWER_DESCRIPTORS = [
  { key: 'previewMaxWidth', label: 'Preview width (px)', category: 'viewer-common', type: 'number', min: 320, max: 1600, default: 900,
    hint: 'Width of the rendered preview. On desktop split view this also sets the preview pane size — drag the divider between the panes to change it live.' },
  { key: 'previewFontSize', label: 'Preview font size (px)', category: 'viewer-common', type: 'number', min: 10, max: 28, default: 16,
    hint: 'Base text size of the rendered content (markdown, HTML, notebooks, …).' },
  { key: 'syncScroll', label: 'Sync scroll', category: 'viewer-common', type: 'bool', default: true,
    hint: 'Scroll the editor and preview together when both are visible.' },
  { key: 'previewLineHeight', label: 'Preview line height', category: 'viewer-extended', type: 'select', options: ['1.3', '1.5', '1.6', '1.8', '2.0'], default: '1.6',
    hint: 'Spacing between lines of rendered text.' },
  { key: 'previewPadding', label: 'Preview padding (px)', category: 'viewer-extended', type: 'number', min: 0, max: 80, default: 20,
    hint: 'Inner margin around the rendered content.' },
  { key: 'readerFontFamily', label: 'Reader font', category: 'viewer-extended', type: 'select', options: ['serif', 'sans', 'mono'], default: 'serif',
    hint: 'Typeface for long-form e-book and document reading views.' },
  { key: 'readerTheme', label: 'Reader theme', category: 'viewer-extended', type: 'select', options: ['default', 'sepia', 'dark'], default: 'default',
    hint: 'Reading color theme for iframe-based e-book previews.' },
];

// Map flat values -> Monaco editor options.
export function applyMonacoOptions(v) {
  return {
    wordWrap: v.wordWrap ?? 'on',
    fontSize: v.fontSize ?? 14,
    fontFamily: v.fontFamily && v.fontFamily !== 'monospace' ? v.fontFamily + ', monospace' : 'monospace',
    lineHeight: v.lineHeight || 0,            // 0 = auto
    lineNumbers: v.lineNumbers ?? 'on',
    tabSize: v.tabSize ?? 2,
    minimap: { enabled: !!v.minimap },
    renderWhitespace: v.renderWhitespace ?? 'none',
    guides: { indentation: v.indentGuides !== false },
    insertSpaces: v.insertSpaces ?? true,
    cursorStyle: v.cursorStyle ?? 'line',
    cursorBlinking: v.cursorBlinking ?? 'blink',
    smoothScrolling: !!v.smoothScrolling,
    mouseWheelZoom: !!v.mouseWheelZoom,
    renderControlCharacters: !!v.renderControlCharacters,
    fontLigatures: !!v.fontLigatures,
    bracketPairColorization: { enabled: v.bracketPairColorization !== false },
    stickyScroll: { enabled: !!v.stickyScroll },
    folding: v.folding !== false,
  };
}

// Map flat values -> preview CSS variables (consumed by the iframe template).
export function previewStyle(v) {
  return {
    maxWidth: Number(v.previewMaxWidth) || 900,
    fontSize: Number(v.previewFontSize) || 16,
    lineHeight: Number(v.previewLineHeight) || 1.6,
    padding: v.previewPadding != null ? Number(v.previewPadding) : 20,
    readerFontFamily: ['serif', 'sans', 'mono'].includes(v.readerFontFamily) ? v.readerFontFamily : 'serif',
    readerTheme: ['default', 'sepia', 'dark'].includes(v.readerTheme) ? v.readerTheme : 'default',
  };
}

// Build the descriptor list for a type, honoring capabilities + hidden keys.
export function descriptorsFor(type) {
  const out = [...GENERAL_DESCRIPTORS];
  if (type.capabilities.rawView) out.push(...MONACO_DESCRIPTORS);
  if (type.capabilities.preview) {
    out.push(...VIEWER_DESCRIPTORS);
    out.push(...(type.settings?.schema || []));
  }
  const hidden = new Set(type.settings?.hidden || []);
  return out.filter((d) => !hidden.has(d.key));
}

export const MONACO_KEYS = new Set(MONACO_DESCRIPTORS.map((d) => d.key));
// Keys persisted as a global (cross-type) default: editor options + general app prefs.
export const GLOBAL_KEYS = new Set([...MONACO_KEYS, ...GENERAL_DESCRIPTORS.map((d) => d.key)]);
