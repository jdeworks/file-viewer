export default {
  id: 'glances-config',
  label: 'Glances config',
  match(intake, baseType) {
    if (baseType?.id !== 'ini') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'glances.conf') return true;
    const t = intake.text || '';
    const hasGlancesSection = t.includes('[outputs]') || t.includes('[webserver]');
    const hasGlancesKey = t.includes('refresh') || t.includes('cached');
    return hasGlancesSection && hasGlancesKey;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Glances cross-platform system monitoring tool configuration — defines refresh rates, webserver settings, stat sections, and thresholds.',
    usedFor: [
      { label: 'Glances config', description: 'Configure Glances system monitor refresh intervals, web interface, and enabled stat sections.', href: 'https://glances.readthedocs.io/en/latest/config.html' },
    ],
  },
};
