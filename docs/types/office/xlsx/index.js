import { detect } from './detect.js';

export default {
  id: 'xlsx',
  label: 'Spreadsheet',
  detect,
  capabilities: {
    rawView: false,      // binary, preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // editable grid in the parent pane — not a static sanitized body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: CSV / JSON / all-sheets
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
