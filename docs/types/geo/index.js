import { detect } from './detect.js';

export default {
  id: 'geo',
  label: 'Map (GeoJSON/GPX)',
  detect,
  capabilities: {
    rawView: true,       // it's text — keep the source + diff available
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'xml',   // overridden to json-ish where relevant; fine for highlighting
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
