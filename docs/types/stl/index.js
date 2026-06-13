import { detect } from './detect.js';

export default {
  id: 'stl',
  label: '3D model (STL)',
  detect,
  capabilities: {
    rawView: false,      // binary/mesh data — interactive 3D preview only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // live canvas, not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
