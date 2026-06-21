export default {
  id: 'kavita-config',
  label: 'Kavita Config',
  match(intake) {
    const n = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    if (n === 'kavita-config.json' || n === 'kavita-appsettings.json') return true;
    if (n === 'appsettings.json') {
      const parsed = intake.parsed ?? (() => { try { return JSON.parse(intake.text || '{}'); } catch { return {}; } })();
      return (
        parsed.TokenKey !== undefined &&
        parsed.Port !== undefined &&
        parsed.LoggingLevel !== undefined
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
