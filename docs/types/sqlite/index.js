import { detect } from './detect.js';

export default {
  id: 'sqlite',
  label: 'SQLite database',
  detect,
  capabilities: {
    rawView: false,      // binary DB — table browser only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // interactive grid, not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
