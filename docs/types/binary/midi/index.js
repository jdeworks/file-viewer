import { detect } from './detect.js';

export default {
  id: 'midi',
  label: 'MIDI Sequence',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: true },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: async (intake) => (await m.extractMetadata(intake)).fields })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
