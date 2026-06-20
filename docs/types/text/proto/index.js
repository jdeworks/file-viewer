import { detect } from './detect.js';
export default {
  id: 'proto',
  label: 'Protocol Buffer',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: true },
  syntaxLanguage: 'proto',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
