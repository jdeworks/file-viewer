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
};
