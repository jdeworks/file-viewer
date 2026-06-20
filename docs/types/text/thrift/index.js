import { detect } from './detect.js';
export default {
  id: 'thrift',
  label: 'Apache Thrift',
  detect,
  capabilities: { rawView: true, preview: true, diff: true, magicSelector: false, screenshot: true },
  syntaxLanguage: 'thrift',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
