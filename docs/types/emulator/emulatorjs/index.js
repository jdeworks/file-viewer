import { detect } from './detect.js';

export default {
  id: 'emulatorjs',
  label: 'Console ROM (EmulatorJS)',
  group: 'Emulator',
  capabilities: { rawView: false, preview: true, diff: false },
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
