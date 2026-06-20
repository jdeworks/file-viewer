export default {
  id: 'invidious-config',
  label: 'Invidious Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'invidious-config.yml' || n === 'invidious-config.yaml' || n === 'invidious.yml') return true;
    const cfg = intake.parsed || {};
    return !!cfg.db && typeof cfg.db === 'object' && cfg.hmac_key !== undefined;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Invidious self-hosted YouTube frontend configuration — server binding, PostgreSQL database, security keys, performance threads, feature flags, and default user preferences.',
    usedFor: [{ label: 'Invidious', description: 'Privacy-respecting self-hosted YouTube frontend', href: 'https://github.com/iv-org/invidious' }],
  },
};
