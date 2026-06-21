export default {
  id: 'mattermost-config',
  label: 'Mattermost Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n !== 'config.json' && n !== 'mattermost-config.json') return false;
    const parsed = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();
    return 'ServiceSettings' in parsed && ('SqlSettings' in parsed || 'TeamSettings' in parsed);
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Mattermost team messaging server configuration — service, database, email, file storage, and team settings.',
    tags: ['mattermost', 'team-messaging', 'chat', 'config'],
  },
};
