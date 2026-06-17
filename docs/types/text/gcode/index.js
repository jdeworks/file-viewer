import { detect } from './detect.js';
import { extractMetadata } from './metadata.js';

export default {
  id: 'gcode',
  label: 'G-code (3D Print)',
  detect,
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {},
};
