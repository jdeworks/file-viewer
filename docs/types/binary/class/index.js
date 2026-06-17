import { detect } from './detect.js';

export default {
  id: 'java-class',
  label: 'Java Class',
  capabilities: { rawView: true, preview: true, diff: false },
  detect,
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
