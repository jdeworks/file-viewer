import { detect } from './detect.js';

export default {
  id: 'ruffle',
  label: 'Flash (SWF via Ruffle)',
  group: 'Emulator',
  capabilities: { rawView: false, preview: true, diff: false },
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
