import { detect } from './detect.js';

export default {
  id: 'ply',
  label: '3D model (PLY)',
  detect,
  capabilities: {
    rawView: false,      // mesh data (ASCII or binary) — interactive 3D preview only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: convert to the other mesh formats
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
