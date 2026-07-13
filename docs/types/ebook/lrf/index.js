import { detect } from './detect.js';

export default {
  id: 'lrf',
  label: 'Sony LRF (e-book)',
  detect,
  capabilities: {
    rawView: false,
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  // parentNode-mounted, preview-only reader with its own size/font/theme chrome: app.js mounts it
  // without applying previewStyle, so the generic Preview settings (width/font/line-height/padding/
  // reader font+theme, plus syncScroll which needs a raw pane this type lacks) would be dead
  // controls. Hide them rather than lie about what the sidebar controls. (settings audit 2026-07-13)
  settings: {
    hidden: ['previewWidthMode', 'previewMaxWidth', 'previewFontSize', 'syncScroll', 'previewLineHeight', 'previewPadding', 'readerFontFamily', 'readerTheme'],
  },
};
