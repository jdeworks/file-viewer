import { detect } from './detect.js';

export default {
  id: 'zip',
  label: 'Archive',
  detect,
  capabilities: {
    rawView: false,      // binary container — listing only
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
