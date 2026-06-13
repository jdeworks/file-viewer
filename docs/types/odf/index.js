import { detect } from './detect.js';

export default {
  id: 'odf',
  label: 'OpenDocument',
  detect,
  capabilities: {
    rawView: false,      // zip container — preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
