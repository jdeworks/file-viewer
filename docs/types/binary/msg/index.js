import { detect } from './detect.js';

export default {
  id: 'msg',
  label: 'Outlook Email',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
