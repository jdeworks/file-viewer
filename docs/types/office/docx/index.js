import { detect } from './detect.js';

export default {
  id: 'docx',
  label: 'Word',
  detect,
  capabilities: {
    rawView: false,      // binary, preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // editor in the parent pane — not a static sanitized body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    // parentNode-mounted TipTap editor (no iframe): app.js skips previewStyle for parentNode
    // renderers, and this viewer has no font/theme controls of its own — Word's native styling is
    // authoritative — so the generic Preview settings would be dead controls. Hide them.
    // (settings audit 2026-07-13)
    hidden: ['previewWidthMode', 'previewMaxWidth', 'previewFontSize', 'syncScroll', 'previewLineHeight', 'previewPadding', 'readerFontFamily', 'readerTheme'],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
