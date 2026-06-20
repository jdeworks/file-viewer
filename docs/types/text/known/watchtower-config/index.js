export default {
  id: 'watchtower-config',
  label: 'Watchtower Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'watchtower.env') return true;
    const text = intake.text || '';
    return text.includes('WATCHTOWER_CLEANUP') || text.includes('WATCHTOWER_SCHEDULE') || text.includes('WATCHTOWER_POLL_INTERVAL');
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Watchtower automatic Docker container updater configuration — controls update schedule, cleanup behavior, notifications, registry credentials, and HTTP API.',
    usedFor: [{ label: 'Watchtower', description: 'Automatically update running Docker containers', href: 'https://containrrr.dev/watchtower/' }],
  },
};
