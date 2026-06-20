export default {
  id: 'stirling-pdf-config',
  label: 'Stirling-PDF Settings',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'stirling-pdf-settings.yml' || n === 'stirling-pdf-settings.yaml') return true;
    const nameMatch = n === 'settings.yml' || n === 'settings.yaml';
    if (!nameMatch) return false;
    const cfg = intake.parsed || {};
    const hasUi = cfg.ui && typeof cfg.ui === 'object' &&
      (cfg.ui.appName || cfg.ui['app-name'] || cfg.ui.homeDescription);
    const hasSecurity = cfg.security && typeof cfg.security === 'object';
    return !!(hasUi && hasSecurity);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Stirling PDF self-hosted PDF tools web application settings — security, UI, system, endpoints, and metrics.',
    tags: ['stirling-pdf', 'pdf', 'self-hosted', 'config'],
  },
};
