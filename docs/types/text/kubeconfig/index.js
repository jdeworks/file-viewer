import { detect } from './detect.js';

export default {
  id: 'kubeconfig',
  label: 'Kubernetes Config',
  group: 'Text',
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: 'yaml',
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
