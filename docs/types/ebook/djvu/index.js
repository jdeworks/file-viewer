import { detect } from './detect.js';

export default {
  id: 'djvu',
  label: 'DjVu Document',
  detect,
  capabilities: {
    rawView: false,
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extract })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
