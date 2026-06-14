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
};
