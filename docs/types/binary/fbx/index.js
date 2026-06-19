import { detect } from './detect.js';

export default {
  id: 'fbx',
  label: 'FBX 3D Animation',
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
