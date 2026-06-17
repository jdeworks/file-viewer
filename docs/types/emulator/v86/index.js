import { detect } from './detect.js';

export default {
  id: 'v86',
  label: 'x86 Disk Image (v86)',
  group: 'Emulator',
  capabilities: { rawView: false, preview: true, diff: false },
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
