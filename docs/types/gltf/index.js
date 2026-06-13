import { detect } from './detect.js';

export default {
  id: 'gltf',
  label: '3D model (glTF)',
  detect,
  capabilities: {
    rawView: false,      // GLB is binary; .gltf JSON is shown via the 3D preview
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
