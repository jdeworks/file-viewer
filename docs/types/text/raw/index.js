// Raw / plain-text fallback type. Always available so the viewer is never a dead end.
// Declares rawView only — no preview, no execution. Binary files land here too (Monaco
// will show the decoded text or, if binary, the shell shows a "binary" notice).

import { detect } from './detect.js';

export default {
  id: 'raw',
  label: 'Plain text',
  detect,
  capabilities: {
    rawView: true,
    preview: false,
    diff: true,
    magicSelector: false,
    screenshot: false,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: null,
  loadMetadata: null,
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
