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
};
