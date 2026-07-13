import { detect } from './detect.js';

export default {
  id: 'pdf',
  label: 'PDF',
  detect,
  capabilities: {
    rawView: false,      // preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // rendered in the parent pane (interactive editor) — not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: extract text (.txt) / pages as PNG zip
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    // parentNode-mounted, preview-only: only pdfScale (below) actually affects this viewer. The
    // generic Preview settings never reach a parentNode renderer (app.js skips previewStyle), so
    // hide them and keep just the control that works. (settings audit 2026-07-13)
    hidden: ['previewWidthMode', 'previewMaxWidth', 'previewFontSize', 'syncScroll', 'previewLineHeight', 'previewPadding', 'readerFontFamily', 'readerTheme'],
    schema: [
      { key: 'pdfScale', label: 'Render scale', category: 'viewer-common', type: 'select', options: [1, 1.5, 2, 3], default: 1.5 },
    ],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
