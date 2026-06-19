export default {
  id: 'postgresql-conf',
  label: 'PostgreSQL config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'postgresql.conf';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PostgreSQL server configuration — connections, memory, WAL settings, logging, and timezone.',
    usedFor: [{ label: 'PostgreSQL config', description: 'Configure PostgreSQL listen addresses, memory, WAL level, and logging settings.', href: 'https://www.postgresql.org/docs/current/runtime-config.html' }],
  },
};
