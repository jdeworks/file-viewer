import { detect } from './detect.js';

export default {
  id: 'html',
  label: 'HTML',
  detect,
  capabilities: {
    rawView: true,
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'html',
  loadRenderer: () => import('./renderer.js'),
  loadDiffRenderer: () => import('./htmldiff.js'),   // structural DOM diff instead of text diff
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
  settings: {
    schema: [
      { key: 'htmlInjectHead', label: 'Inject into <head> (one tag per line)', category: 'viewer-extended', type: 'textarea', default: '',
        hint: 'Extra <script> or <link> tags injected before </head> in every HTML preview. Example: <script src="https://cdn.tailwindcss.com"></script>. Only user-entered tags are injected — no automatic CDN.' },
    ],
  },
};
