import { detect } from './detect.js';

export default {
  id: 'yaml',
  label: 'YAML',
  detect,
  capabilities: {
    rawView: true,      // YAML source is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'yaml',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
