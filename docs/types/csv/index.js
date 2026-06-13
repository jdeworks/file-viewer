import { detect } from './detect.js';

export default {
  id: 'csv',
  label: 'CSV / TSV',
  detect,
  capabilities: {
    rawView: true,       // editable text -> raw + diff
    preview: true,       // rendered table
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: JSON / Excel (.xlsx)
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'csvHeader', label: 'First row is header', category: 'viewer-common', type: 'bool', default: true },
      { key: 'delimiter', label: 'Delimiter', category: 'viewer-common', type: 'select', options: ['auto', 'comma', 'semicolon', 'tab', 'pipe'], default: 'auto' },
    ],
    presets: [
      { id: 'default', label: 'Default', url: new URL('./settings.default.json', import.meta.url) },
    ],
  },
};
