import { detect } from './detect.js';

export default {
  id: 'dockerfile',
  label: 'Dockerfile',
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: false },
  syntaxLanguage: 'dockerfile',
  preferredMode: 'split',
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.metadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
