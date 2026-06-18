import { detect } from './detect.js';
import { languageFor, languageLabelFor } from './langmap.js';

export default {
  id: 'code',
  label: 'Code',
  detect,
  capabilities: {
    rawView: true,
    preview: false,
    diff: true,
    magicSelector: false,
    screenshot: false,
  },
  syntaxLanguage: (intake) => languageFor(intake),   // per-file Monaco language
  displayLabel: (intake) => languageLabelFor(intake) + ' source code',
  loadRenderer: null,
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
