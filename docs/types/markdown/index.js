import { detect } from './detect.js';

export default {
  id: 'markdown',
  label: 'Markdown',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: true,
    screenshot: true,
  },
  syntaxLanguage: 'markdown',
  loadRenderer: () => import('./renderer.js'),
  loadExports: () => import('./exports.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    // Type-specific viewer descriptors (merged with core monaco + generic viewer ones).
    schema: [
      // previewMaxWidth / font / spacing are generic now (settings-schema VIEWER_DESCRIPTORS).
      // These are markdown-it parser options, applied per render via ctx.settings.
      { key: 'markdownEditor', label: 'Markdown editor', category: 'monaco-common', type: 'select',
        options: ['monaco', 'wysiwyg'], default: 'monaco',
        hint: 'Default editor mode for Markdown files. "wysiwyg" opens the TipTap rich visual editor (round-trips markdown); "monaco" uses the code editor. You can still toggle between modes with the toolbar button.' },
      { key: 'mdLinkify', label: 'Auto-link URLs', category: 'viewer-extended', type: 'bool', default: true,
        hint: 'Turn bare URLs like https://example.com into clickable links.' },
      { key: 'mdTypographer', label: 'Smart typography', category: 'viewer-extended', type: 'bool', default: true,
        hint: 'Replace straight quotes, dashes and ellipses with typographic equivalents (“ ” — …).' },
      { key: 'mdBreaks', label: 'Line breaks as <br>', category: 'viewer-extended', type: 'bool', default: false,
        hint: 'Treat every single newline as a hard line break (GitHub-comment style).' },
    ],
    hidden: [],
    // Presets are explicit per-type — no directory listing needed.
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
      { id: 'compact', label: 'Compact', url: new URL('./settings.compact.json', import.meta.url) },
    ],
  },
};
