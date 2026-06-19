import { detect } from './detect.js';

export default {
  id: 'sdf',
  label: 'SDF / MDL Molfile',
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  preferredMode: 'preview',
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
