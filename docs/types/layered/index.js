import { detect } from './detect.js';

export default {
  id: 'layered',
  label: 'Layered Image',
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
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
