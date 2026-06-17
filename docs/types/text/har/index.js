import { detect } from './detect.js';

export default {
  id: 'har',
  label: 'HTTP Archive (HAR)',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: true },
  syntaxLanguage: 'json',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: async (intake) => (await m.extractMetadata(intake)).fields })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
