import { detect } from './detect.js';

export default {
  id: 'font',
  label: 'Font',
  detect,
  capabilities: {
    rawView: false,      // binary font data — specimen preview only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // live FontFace in the parent pane — not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
