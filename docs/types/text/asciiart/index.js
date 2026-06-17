import { detect } from './detect.js';

export default {
  id: 'asciiart',
  label: 'ASCII / ANSI Art',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
