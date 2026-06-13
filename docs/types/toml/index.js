import { detect } from './detect.js';

export default {
  id: 'toml',
  label: 'TOML',
  detect,
  capabilities: {
    rawView: true,      // TOML source is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'toml',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
