export default {
  id: 'stirling-pdf-config',
  label: 'Stirling-PDF Settings',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'stirling-pdf-settings.yml' || n === 'stirling-pdf-settings.yaml') return true;
    const nameMatch = n === 'settings.yml' || n === 'settings.yaml';
    if (!nameMatch) return false;
    // Generic filename — disambiguate via Stirling-PDF's distinctive top-level section shape
    // (intake.parsed is never populated by the intake layer, so parse the heuristic from text).
    const text = intake.text || '';
    const hasUi = /^ui:\s*$/m.test(text) && /^\s+(appName|app-name|homeDescription)\s*:/m.test(text);
    const hasSecurity = /^security:\s*$/m.test(text);
    return hasUi && hasSecurity;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stirling PDF self-hosted PDF tools web application settings — security, UI, system, endpoints, and metrics.',
    tags: ['stirling-pdf', 'pdf', 'self-hosted', 'config'],
  },
};
