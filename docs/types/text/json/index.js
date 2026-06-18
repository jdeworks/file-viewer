import { detect } from './detect.js';

export default {
  id: 'json',
  label: 'JSON',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'json',
  loadRenderer: () => import('./renderer.js'),
  loadExports: () => import('./exports.js'),   // Export menu: format conversion
  loadMetadata: () => import('./metadata.js'),
  // Declarative custom diff (Layer 2): semantic key-tree diff lives in the json folder,
  // not in core. Module exports render(host, originalText, currentText).
  loadDiffRenderer: () => import('./jsondiff.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'jsonSortKeys', label: 'Sort object keys', category: 'viewer-common', type: 'select', options: ['original', 'A-Z', 'Z-A'], default: 'original',
        hint: 'Sort keys in the rendered preview only. Arrays and the editable source keep their original order.' },
    ],
  },
};
