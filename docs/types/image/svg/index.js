import { detect } from './detect.js';

export default {
  id: 'svg',
  label: 'SVG image',
  group: 'Image',
  detect,
  capabilities: {
    rawView: true,       // App-level Monaco editor for the SVG source
    preview: true,       // Visual-only sandboxed iframe preview
    diff: true,          // Source diff between versions
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'xml',          // Monaco highlights SVG as XML
  preferredMode: 'split',         // App-level source and visual preview side by side
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('../metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
