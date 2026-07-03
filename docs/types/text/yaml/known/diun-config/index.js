export default {
  id: 'diun-config',
  label: 'Diun Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'diun.yaml' || n === 'diun.yml') return true;
    // match() is synchronous (js-yaml loads async) and intake.parsed is never populated at
    // detection time, so this has to be a text heuristic, not a parsed-object check.
    const text = intake.text || intake.textSample || '';
    return /^watch:/m.test(text) && (/^providers:/m.test(text) || /^notif:/m.test(text));
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Diun (Docker Image Update Notifier) configuration — watch schedule, providers, and notification channels.',
    usedFor: [{ label: 'Docker image update notifications', description: 'Monitor Docker image updates and notify via Slack, Telegram, Discord, mail, and more.', href: 'https://crazymax.dev/diun/' }],
  },
};
