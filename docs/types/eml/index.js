import { detect } from './detect.js';

export default {
  id: 'eml',
  label: 'Email',
  detect,
  capabilities: {
    rawView: true,      // the raw RFC 822 source is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
