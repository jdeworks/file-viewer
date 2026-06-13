import { detect } from './detect.js';

export default {
  id: 'epub',
  label: 'E-book',
  detect,
  capabilities: {
    rawView: false,      // a zip container — read it, don't show raw bytes
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // stateful reader (blob images, live scroll) — not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
