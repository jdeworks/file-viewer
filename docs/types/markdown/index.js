import { detect } from './detect.js';

export default {
  id: 'markdown',
  label: 'Markdown',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: true,
    screenshot: true,
  },
  syntaxLanguage: 'markdown',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    // Type-specific viewer descriptors (merged with core monaco + generic viewer ones).
    schema: [
      { key: 'previewMaxWidth', label: 'Preview width (px)', category: 'viewer-common', type: 'number', min: 320, max: 1600, default: 900 },
    ],
    hidden: [],
    // Presets are explicit per-type — no directory listing needed.
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
      { id: 'compact', label: 'Compact', url: new URL('./settings.compact.json', import.meta.url) },
    ],
  },
};
