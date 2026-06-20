import { detect } from './detect.js';
import { extractMetadata } from './metadata.js';

export default {
  id: 'ico',
  label: 'Icon File',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  extractMetadata,
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {},
};
