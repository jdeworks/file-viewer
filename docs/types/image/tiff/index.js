import { detect } from './detect.js';

export default {
  id: 'tiff',
  label: 'TIFF image',
  group: 'Image',
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: true },
  syntaxLanguage: null,
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
