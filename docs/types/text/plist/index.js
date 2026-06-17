import { detect } from './detect.js';

export default {
  id: 'plist',
  label: 'Property List',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: false },
  syntaxLanguage: 'xml',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
