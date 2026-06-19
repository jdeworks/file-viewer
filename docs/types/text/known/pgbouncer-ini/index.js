export default {
  id: 'pgbouncer-ini',
  label: 'PgBouncer config',
  match(intake) {
    const name = (intake.name || intake.filename || '').split('/').pop().toLowerCase();
    return name === 'pgbouncer.ini';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'PgBouncer connection pooler configuration — databases, pool mode, connection limits, and auth settings.',
    usedFor: [{ label: 'PgBouncer config', description: 'Configure PgBouncer pool mode, client/server connection limits, and database routing.', href: 'https://www.pgbouncer.org/config.html' }],
  },
};
