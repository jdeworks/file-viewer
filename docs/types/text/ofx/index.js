import { detect } from './detect.js';

export default {
  id: 'ofx',
  label: 'OFX / QFX Financial',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: true },
  syntaxLanguage: 'xml',
  loadRenderer: () => import('./renderer.js'),
  loadExports: () => import('./exports.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: async (intake) => (await m.extractMetadata(intake)).fields })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
