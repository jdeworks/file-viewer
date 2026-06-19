import { detect } from './detect.js';

export default {
  id: 'nupkg',
  label: 'Package (NuGet/VSIX/Wheel/JAR)',
  capabilities: { rawView: false, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.metadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
