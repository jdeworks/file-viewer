import { detect } from './detect.js';

export default {
  id: 'musicxml',
  label: 'MusicXML Score',
  detect,
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: true },
  syntaxLanguage: 'xml',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: async (intake) => (await m.extractMetadata(intake)).fields })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
