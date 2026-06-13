import { detect } from './detect.js';

export default {
  id: 'markdown',
  label: 'Markdown',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: true,
    screenshot: true,
  },
  syntaxLanguage: 'markdown',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
