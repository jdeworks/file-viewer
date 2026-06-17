import { detect } from './detect.js';

export default {
  id: 'iwork',
  label: 'Apple iWork',
  capabilities: { rawView: false, preview: true, diff: false, screenshot: false },
  detect,
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
