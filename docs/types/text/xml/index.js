import { detect } from './detect.js';

export default {
  id: 'xml',
  label: 'XML',
  detect,
  capabilities: {
    rawView: true,       // XML is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'xml',
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('./xmldiff.js'),   // structural DOM diff instead of text diff
  loadExports: () => import('./exports.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
