import { detect } from './detect.js';

export default {
  id: 'editorconfig',
  label: 'EditorConfig',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: false },
  syntaxLanguage: 'ini',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then(m => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
