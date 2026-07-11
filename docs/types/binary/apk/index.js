import { detect } from './detect.js';

export default {
  id: 'apk',
  label: 'Android Package / Bundle',
  detect,
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: true },
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: (intake) => m.extractMetadata(intake).then((r) => r.fields) })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
