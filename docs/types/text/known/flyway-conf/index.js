export default {
  id: 'flyway-conf',
  label: 'Flyway Config',
  match(intake) {
    const n = (intake.name || '').toLowerCase();
    return n === 'flyway.conf' || n === 'flyway.properties' || n === 'flyway.toml';
  },
  loadRenderer: () => import('./renderer.js'),
  about: {
    description: 'Flyway database migration configuration — defines the JDBC URL, credentials, migration locations, baseline settings, and schema targets.',
    usedFor: [{ label: 'Flyway', description: 'Database version control and migration tool', href: 'https://documentation.red-gate.com/fd/flyway-documentation-138346877.html' }],
  },
};
