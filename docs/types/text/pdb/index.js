import { detect } from './detect.js';

export default {
  id: 'pdb',
  label: 'Protein Structure (.pdb)',
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  preferredMode: 'preview',
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
