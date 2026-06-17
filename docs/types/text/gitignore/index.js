import { detect } from './detect.js';

export default {
  id: 'gitignore',
  label: '.gitignore / ignore rules',
  group: 'Text',
  capabilities: { rawView: true, preview: true, diff: true },
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {},
};
