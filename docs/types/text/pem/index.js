import { detect } from './detect.js';

export default {
  id: 'pem',
  label: 'Certificate / Key (PEM/DER)',
  group: 'Text',
  capabilities: { rawView: true, preview: true, diff: false, magicSelector: false, screenshot: false },
  syntaxLanguage: null,
  // Certificates/keys can expose raw private material in Monaco. Lead with the renderer, which
  // intentionally omits raw key bytes; users can still switch to Raw when they explicitly need it.
  preferredMode: 'preview',
  detect,
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js').then((m) => ({ extract: m.extractMetadata })),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
