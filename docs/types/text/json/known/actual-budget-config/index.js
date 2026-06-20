export default {
  id: 'actual-budget-config',
  label: 'Actual Budget Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'actual-config.json') return true;
    const cfg = intake.parsed || {};
    // JSON config: has dataDir/serverFiles/port
    if (cfg.dataDir !== undefined && cfg.serverFiles !== undefined) return true;
    // env format fallback
    const text = intake.text || '';
    return text.includes('ACTUAL_PORT') && text.includes('ACTUAL_DATA_DIR');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Actual Budget personal finance server configuration — server, HTTPS, login, and upload settings.',
    tags: ['actual-budget', 'finance', 'self-hosted', 'config'],
  },
};
