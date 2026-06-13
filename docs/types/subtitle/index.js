import { detect } from './detect.js';

export default {
  id: 'subtitle',
  label: 'Subtitles',
  detect,
  capabilities: {
    rawView: true,       // subtitle source is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadExports: () => import('./exports.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
