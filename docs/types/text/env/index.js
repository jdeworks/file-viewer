import { detect } from './detect.js';

export default {
  id: 'env',
  label: 'Environment Variables',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: false,  // intentional: diffing env files could expose secrets in diff view
    magicSelector: false,
    screenshot: false,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
