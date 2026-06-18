// Raw / plain-text fallback type. Always available so the viewer is never a dead end.
// Binary files still land here as read-only hex in the raw pane.

import { detect } from './detect.js';

export default {
  id: 'raw',
  label: 'Plain text',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
