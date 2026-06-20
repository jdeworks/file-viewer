export default {
  id: 'uptime-kuma-config',
  label: 'Uptime Kuma Config',
  match(intake, baseType) {
    if (baseType?.id !== 'json') return false;
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.json' && n !== 'uptime-kuma.json') return false;
    const parsed = intake.parsed || {};
    // Uptime Kuma-specific fields
    return 'disableAuth' in parsed || 'trustProxy' in parsed || ('port' in parsed && 'demoMode' in parsed);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Uptime Kuma monitoring server configuration — auth, proxy, rate limiting, and server settings.',
    usedFor: [
      { label: 'Uptime monitoring', description: 'Self-hosted uptime monitoring tool configuration with server and auth settings.', href: 'https://github.com/louislam/uptime-kuma' },
    ],
  },
};
