import { detect } from './detect.js';

export default {
  id: 'ipynb',
  label: 'Jupyter Notebook',
  detect,
  capabilities: {
    rawView: true,      // it's JSON text — keep Monaco + diff available
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'json',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
