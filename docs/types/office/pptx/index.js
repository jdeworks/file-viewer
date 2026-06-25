import { detect } from './detect.js';

export default {
  id: 'pptx',
  label: 'PowerPoint',
  detect,
  capabilities: {
    rawView: false,      // binary, preview-only
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: false,   // parent-pane viewer with live navigation, no static screenshot body
  },
  syntaxLanguage: null,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'pptxScale', label: 'Render scale', category: 'viewer-common', type: 'select', options: [1, 1.5, 2, 3], default: 1.5 },
    ],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
