import { detect } from './detect.js';
import { extractMetadata } from './metadata.js';

export default {
  id: 'procreate',
  label: 'Procreate painting',
  group: 'Image',
  capabilities: { rawView: false, preview: true, diff: false },
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  extractMetadata,
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {},
};
