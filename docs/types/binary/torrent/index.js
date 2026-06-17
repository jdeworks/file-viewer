import { detect } from './detect.js';

export default {
  id: 'torrent',
  label: 'Torrent',
  detect,
  capabilities: {
    rawView: true,
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
