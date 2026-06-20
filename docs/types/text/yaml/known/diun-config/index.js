export default {
  id: 'diun-config',
  label: 'Diun Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'diun.yaml' || n === 'diun.yml') return true;
    const cfg = intake.parsed || {};
    return !!cfg.watch && !!(cfg.providers || cfg.notif);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Diun (Docker Image Update Notifier) configuration — watch schedule, providers, and notification channels.',
    usedFor: [{ label: 'Docker image update notifications', description: 'Monitor Docker image updates and notify via Slack, Telegram, Discord, mail, and more.', href: 'https://crazymax.dev/diun/' }],
  },
};
