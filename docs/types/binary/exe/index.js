import { detect } from './detect.js';

export default {
  id: 'exe',
  label: 'Executable (ELF / PE / Mach-O)',
  detect,
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: false },
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: (intake) => m.extractMetadata(intake).then((r) => r.fields) })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
