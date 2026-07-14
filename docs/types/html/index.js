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
      { key: 'htmlDependencyPreset', label: 'External dependency preset', category: 'viewer-extended', type: 'select', default: 'none', options: [
        { value: 'none', label: 'None (offline/local only)' },
        { value: 'bootstrap', label: 'Bootstrap 5.3.8 (CSS + JS)' },
        { value: 'tailwind', label: 'Tailwind Play CDN v4 (development only)' },
      ], hint: 'Selecting a preset never makes a request. The preview shows a separate Load button with an off-origin warning.' },
      { key: 'htmlCacheRemotePreset', label: 'Cache confirmed dependencies', category: 'viewer-extended', type: 'bool', default: true,
        hint: 'After you explicitly load a preset, keep successful responses in a dedicated cache for later/offline use.' },
      { key: 'htmlInjectHead', label: 'Custom <head> additions', category: 'viewer-extended', type: 'textarea', default: '',
        hint: 'Inline styles work in the sanitized preview. External links and scripts stay blocked until you explicitly trust the raw document; nothing is fetched automatically.' },
    ],
  },
};
