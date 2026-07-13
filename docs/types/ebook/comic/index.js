import { detect } from './detect.js';

export default {
  id: 'comic',
  label: 'Comic book',
  detect,
  capabilities: {
    rawView: false,      // image archive — preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // pages are large blob images; screenshot path not meaningful
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  // parentNode-mounted, preview-only page-image viewer: app.js mounts it without applying
  // previewStyle, so the generic Preview settings (width/font/line-height/padding/reader font+theme,
  // plus syncScroll which needs a raw pane this type lacks) would be dead controls. Hide them
  // rather than lie about what the sidebar controls. (settings audit 2026-07-13)
  settings: {
    hidden: ['previewWidthMode', 'previewMaxWidth', 'previewFontSize', 'syncScroll', 'previewLineHeight', 'previewPadding', 'readerFontFamily', 'readerTheme'],
  },
};
