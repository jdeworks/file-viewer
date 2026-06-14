import { detect } from './detect.js';

export default {
  id: 'obj',
  label: '3D model (OBJ)',
  detect,
  capabilities: {
    rawView: true,       // OBJ is text — keep Monaco + diff alongside the 3D preview
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: false,   // live canvas, not a static body
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: convert to the other mesh formats
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
