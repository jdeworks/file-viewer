import { detect } from './detect.js';

export default {
  id: 'pdf',
  label: 'PDF',
  detect,
  capabilities: {
    rawView: false,      // preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // rendered in the parent pane (interactive editor) — not a static body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'pdfScale', label: 'Render scale', category: 'viewer-common', type: 'select', options: [1, 1.5, 2, 3], default: 1.5 },
    ],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
