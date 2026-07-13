import { detect } from './detect.js';

export default {
  id: 'media',
  label: 'Audio / Video',
  detect,
  capabilities: {
    rawView: false,      // preview-only (binary media)
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // a player frame isn't a meaningful screenshot
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  // parentNode-mounted, preview-only player/mixer with its own controls: app.js mounts it without
  // applying previewStyle, so the generic Preview text settings (width/font/line-height/padding/
  // reader font+theme, plus syncScroll which needs a raw pane this type lacks) are meaningless for
  // audio/video and would be dead controls. Hide them. (settings audit 2026-07-13)
  settings: {
    hidden: ['previewWidthMode', 'previewMaxWidth', 'previewFontSize', 'syncScroll', 'previewLineHeight', 'previewPadding', 'readerFontFamily', 'readerTheme'],
  },
};
