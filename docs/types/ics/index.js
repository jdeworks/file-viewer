import { detect } from './detect.js';

export default {
  id: 'ics',
  label: 'Calendar',
  detect,
  capabilities: {
    rawView: true,      // iCalendar source is text — keep Monaco + diff
    preview: true,
    diff: true,
    magicSelector: false,
    screenshot: true,
  },
  syntaxLanguage: 'plaintext',
  loadRenderer: () => import('./renderer.js'),
  loadMetadata: () => import('./metadata.js'),
  settingsUrl: new URL('./settings.default.json', import.meta.url),
};
