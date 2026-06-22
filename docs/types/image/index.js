import { detect } from './detect.js';

export default {
  id: 'image',
  label: 'Image',
  detect,
  capabilities: {
    rawView: false,      // preview-only (SVG source can be viewed by overriding to Code)
    preview: true,
    diff: false,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: null,
  // renderer.generated.js is the build-time bundle of renderer.js + its edit modules (one chunk on
  // image-open instead of ~12). Source stays modular; regen: node scripts/gen-image-renderer.mjs.
  loadRenderer: () => import('./renderer.generated.js'),
  loadMetadata: () => import('./metadata.js'),
  loadExports: () => import('./exports.js'),   // Export menu: PNG / JPEG / WebP (+ SVG)
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
