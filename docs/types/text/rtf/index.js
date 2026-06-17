import { detect } from './detect.js';

export default {
  id: 'rtf',
  label: 'Rich Text Format',
  detect,
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
