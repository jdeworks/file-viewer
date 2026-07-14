import { detect } from './detect.js';

export default {
  id: 'ini',
  label: 'Config (INI/env)',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'ini',
  preferredMode: 'preview',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
