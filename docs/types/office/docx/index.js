import { detect } from './detect.js';

export default {
  id: 'docx',
  label: 'Word',
  detect,
  capabilities: {
    rawView: false,      // binary, preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'previewMaxWidth', label: 'Preview width (px)', category: 'viewer-common', type: 'number', min: 320, max: 1600, default: 820 },
    ],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
