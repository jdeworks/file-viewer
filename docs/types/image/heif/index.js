import { detect } from './detect.js';

export default {
  id: 'heif',
  label: 'HEIC/HEIF Image',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: true },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
