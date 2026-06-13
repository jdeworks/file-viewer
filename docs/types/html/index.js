import { detect } from './detect.js';

export default {
  id: 'html',
  label: 'HTML',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'html',
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('./htmldiff.js'),   // structural DOM diff instead of text diff
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
