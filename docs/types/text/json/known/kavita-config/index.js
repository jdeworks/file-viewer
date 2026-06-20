export default {
  id: 'kavita-config',
  label: 'Kavita Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'kavita-config.json') return true;
    if (n === 'appsettings.json') {
      return (
        intake.parsed &&
        intake.parsed.TokenKey !== undefined &&
        intake.parsed.Port !== undefined &&
        intake.parsed.LoggingLevel !== undefined
      );
    }
    return false;
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Kavita self-hosted comic and book reader server configuration — port, security keys, logging level, cache, and backup settings.',
    tags: ['kavita', 'comics', 'books', 'media-server', 'self-hosted', 'config'],
  },
};
