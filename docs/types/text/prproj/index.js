import { detect } from './detect.js';

export default {
  id: 'prproj',
  label: 'Adobe Premiere Project',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: true },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: (intake) => m.extractMetadata(intake).then((r) => r.fields) })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
