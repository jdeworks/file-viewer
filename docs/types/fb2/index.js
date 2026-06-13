import { detect } from './detect.js';

export default {
  id: 'fb2',
  label: 'FictionBook (FB2)',
  detect,
  capabilities: {
    rawView: true,       // it's XML text — raw source + diff available
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'xml',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
