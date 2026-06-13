import { detect } from './detect.js';

export default {
  id: 'image',
  label: 'Image',
  detect,
  capabilities: {
    rawView: false,      // preview-only (SVG source can be viewed by overriding to Code)
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
