// Settings descriptor schema (WP03). A descriptor is the single source of truth for a
// control: its category drives WHERE it renders, its type drives HOW it renders, and
// applyMonacoOptions() maps values onto Monaco. Types contribute their own VIEWER
// descriptors via index.js `settings.schema`; everything here is common/core.
//
// Categories (render order). monaco-* apply to the raw editor, viewer-* to the preview.
export const CATEGORY_ORDER = ['always', 'monaco-common', 'monaco-extended', 'viewer-common', 'viewer-extended'];
export const CATEGORY_LABEL = {
  always: 'General',
  'monaco-common': 'Editor',
  'monaco-extended': 'Editor — advanced',
  'viewer-common': 'Preview',
  'viewer-extended': 'Preview — advanced',
};
// Which categories collapse by default (extended = expert, start collapsed).
export const CATEGORY_OPEN = { always: true, 'monaco-common': true, 'monaco-extended': false, 'viewer-common': true, 'viewer-extended': false };

// Descriptor: { key, label, category, type:'bool'|'number'|'select', default, options?, min?, max?, hint? }

// Shown for any type with capability.rawView.
export const MONACO_DESCRIPTORS = [
  { key: 'wordWrap', label: 'Word wrap', category: 'monaco-common', type: 'select', options: ['on', 'off', 'bounded'], default: 'on' },
  { key: 'fontSize', label: 'Font size', category: 'monaco-common', type: 'number', min: 8, max: 40, default: 14 },
  { key: 'lineNumbers', label: 'Line numbers', category: 'monaco-common', type: 'select', options: ['on', 'off', 'relative'], default: 'on' },
  { key: 'tabSize', label: 'Tab size', category: 'monaco-common', type: 'number', min: 1, max: 8, default: 2 },

  { key: 'fontFamily', label: 'Font family', category: 'monaco-common', type: 'select', options: ['monospace', 'Menlo', 'Consolas', 'Courier New', 'Fira Code'], default: 'monospace' },

  { key: 'minimap', label: 'Minimap', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'renderWhitespace', label: 'Show whitespace', category: 'monaco-extended', type: 'select', options: ['none', 'boundary', 'trailing', 'all'], default: 'none' },
  { key: 'indentGuides', label: 'Indent guides', category: 'monaco-extended', type: 'bool', default: true },
  { key: 'insertSpaces', label: 'Insert spaces (vs tabs)', category: 'monaco-extended', type: 'bool', default: true },
  { key: 'lineHeight', label: 'Line height (0 = auto)', category: 'monaco-extended', type: 'number', min: 0, max: 48, default: 0 },
  { key: 'cursorStyle', label: 'Cursor style', category: 'monaco-extended', type: 'select', options: ['line', 'block', 'underline', 'line-thin'], default: 'line' },
  { key: 'cursorBlinking', label: 'Cursor blinking', category: 'monaco-extended', type: 'select', options: ['blink', 'smooth', 'phase', 'expand', 'solid'], default: 'blink' },
  { key: 'smoothScrolling', label: 'Smooth scrolling', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'mouseWheelZoom', label: 'Ctrl+wheel zoom', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'renderControlCharacters', label: 'Show control chars', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'fontLigatures', label: 'Font ligatures', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'bracketPairColorization', label: 'Bracket pair colors', category: 'monaco-extended', type: 'bool', default: true },
  { key: 'stickyScroll', label: 'Sticky scroll', category: 'monaco-extended', type: 'bool', default: false },
  { key: 'folding', label: 'Code folding', category: 'monaco-extended', type: 'bool', default: true },
];

// Shown for any type with capability.preview (generic; types add more).
export const VIEWER_DESCRIPTORS = [
  { key: 'syncScroll', label: 'Sync scroll', category: 'viewer-common', type: 'bool', default: true },
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

// Build the descriptor list for a type, honoring capabilities + hidden keys.
export function descriptorsFor(type) {
  const out = [];
  if (type.capabilities.rawView) out.push(...MONACO_DESCRIPTORS);
  if (type.capabilities.preview) {
    out.push(...VIEWER_DESCRIPTORS);
    out.push(...(type.settings?.schema || []));
  }
  const hidden = new Set(type.settings?.hidden || []);
  return out.filter((d) => !hidden.has(d.key));
}

export const MONACO_KEYS = new Set(MONACO_DESCRIPTORS.map((d) => d.key));
